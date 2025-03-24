'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch, 
  FiFileText, 
  FiCopy,
  FiEye,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import templateService, { Template, TemplatesResponse } from '@/services/templateService';
import userService from '@/services/userService';

export default function TemplateManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Load templates when component mounts
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Get user role
        const { role } = await userService.getUserRole();
        setUserRole(role);
        
        // Check permission - only admin and provider can access
        if (role !== 'admin' && role !== 'provider') {
          router.push('/dashboard');
          return;
        }
        
        // Fetch templates
        const templatesData = await templateService.getTemplates();
        setTemplates(templatesData.templates);
        setFilteredTemplates(templatesData.templates);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError('Failed to load templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, router]);
  
  // Filter templates when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTemplates(templates);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = templates.filter(
      template => 
        template.name.toLowerCase().includes(term) || 
        (template.description && template.description.toLowerCase().includes(term))
    );
    
    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);
  
  const handleDeleteTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      // Delete the template
      await templateService.deleteTemplate(selectedTemplate._id || selectedTemplate.id || '');
      
      // Remove the template from the list
      const updatedTemplates = templates.filter(t => 
        (t._id !== selectedTemplate._id) && (t.id !== selectedTemplate.id)
      );
      setTemplates(updatedTemplates);
      setFilteredTemplates(updatedTemplates.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ));
      
      // Close the modal
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleToggleStatus = async (template: Template) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Toggle the template's active status
      const updatedTemplate = await templateService.updateTemplate(
        template._id || template.id || '',
        { isActive: !template.isActive }
      );
      
      // Update the template in the list
      const updatedTemplates = templates.map(t => 
        (t._id === template._id || t.id === template.id) ? updatedTemplate : t
      );
      setTemplates(updatedTemplates);
      setFilteredTemplates(updatedTemplates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      ));
    } catch (err) {
      console.error('Error toggling template status:', err);
      setError('Failed to update template status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDuplicateTemplate = async (template: Template) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Create a duplicate template
      const duplicateData = {
        name: `Copy of ${template.name}`,
        description: template.description,
        sections: template.sections,
        isActive: false,
        createdBy: template.createdBy || null,
        version: template.version || 1
      };
      
      const newTemplate = await templateService.createTemplate(duplicateData);
      
      // Add the new template to the list
      setTemplates([...templates, newTemplate]);
      setFilteredTemplates([...filteredTemplates, newTemplate]);
      
      // Optional: Redirect to edit the new template
      // router.push(`/dashboard/settings/templates/edit/${newTemplate._id || newTemplate.id}`);
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError('Failed to duplicate template. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Only admin and provider can access template management
  if (userRole && userRole !== 'admin' && userRole !== 'provider') {
    router.push('/dashboard');
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="h-10 bg-gray-200 rounded w-full mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage questionnaire templates for patient visits</p>
        </div>
        
        <Link
          href="/dashboard/templates/new"
          className="btn-primary self-start sm:self-auto"
        >
          <FiPlus className="h-4 w-4" />
          <span>New Template</span>
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search templates by name or description..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiFileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? "No templates match your search criteria. Try adjusting your search term." 
                : "You haven't created any assessment templates yet."}
            </p>
            <Link href="/dashboard/templates/new" className="btn-primary inline-flex">
              <FiPlus className="h-4 w-4" />
              <span>Create Template</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sections
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{template.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.sections.length} section{template.sections.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        template.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? (
                          <>
                            <FiCheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <FiXCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/templates/${template._id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View template"
                        >
                          <FiEye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/templates/${template._id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit template"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Duplicate template"
                          disabled={isProcessing}
                        >
                          <FiCopy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(template)}
                          className={`p-1 rounded ${
                            template.isActive
                              ? 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50'
                              : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                          }`}
                          title={template.isActive ? 'Deactivate template' : 'Activate template'}
                          disabled={isProcessing}
                        >
                          {template.isActive ? (
                            <FiXCircle className="h-4 w-4" />
                          ) : (
                            <FiCheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete template"
                          disabled={isProcessing}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiTrash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Template
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the template "{selectedTemplate.name}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTemplate(null);
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 