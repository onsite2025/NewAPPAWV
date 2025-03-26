'use client';

// Remove force-dynamic to allow for prerendering
// export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiEdit, FiCopy, FiTrash2, FiSearch } from 'react-icons/fi';
import { ITemplateResponse } from '@/models/Template';
import templateService, { TemplateSearchParams } from '@/services/templateService';

// Interface for template list items
interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  sections: number;
  questions: number;
  lastUpdated: string;
  isDefault: boolean;
  createdBy: any; // Type will be refined when user authentication is implemented
}

// Loading component for Suspense fallback
function TemplatesLoading() {
  return (
    <div className="flex flex-col items-center justify-center my-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Loading templates...</p>
    </div>
  );
}

// Main component content extracted to be wrapped in Suspense
function TemplatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search') || '';
  
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);
  
  useEffect(() => {
    fetchTemplates(search);
  }, [search]);
  
  const fetchTemplates = async (searchTerm?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: TemplateSearchParams = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await templateService.getTemplates(params);
      
      if (!response || !response.templates) {
        setError('Invalid template data received');
        setTemplates([]);
        setIsLoading(false);
        return;
      }
      
      // Map API data to UI template list items
      const templateItems: TemplateListItem[] = response.templates.map((template: ITemplateResponse) => {
        // Ensure sections exists and is an array
        const sections = Array.isArray(template.sections) ? template.sections : [];
        
        // Count total questions across all sections
        const questionCount = sections.reduce(
          (total, section) => {
            // Ensure questions exists and is an array
            const questions = Array.isArray(section.questions) ? section.questions : [];
            return total + questions.length;
          }, 0
        );
        
        return {
          id: template._id?.toString() || template.id || '',
          name: template.name,
          description: template.description || '',
          sections: sections.length,
          questions: questionCount,
          lastUpdated: new Date(template.updatedAt || Date.now()).toLocaleDateString(),
          isDefault: false, // This would be determined by backend logic
          createdBy: template.createdBy,
        };
      });
      
      setTemplates(templateItems);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates(search);
    
    // Update URL with search parameter
    router.push(`/dashboard/templates${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  };
  
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      await templateService.deleteTemplate(id);
      // Refresh the template list
      fetchTemplates(search);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    }
  };
  
  const handleDuplicateTemplate = async (id: string) => {
    try {
      // Fetch the template to duplicate
      const fullTemplate = await templateService.getTemplateById(id);
      
      if (!fullTemplate) {
        throw new Error('Template not found');
      }
      
      // Create a duplicate with a new name
      const duplicatedTemplate = {
        name: `${fullTemplate.name} (Copy)`,
        description: fullTemplate.description,
        sections: fullTemplate.sections || [],
        isActive: false,
        version: 1,
        createdBy: null
      };
      
      await templateService.createTemplate(duplicatedTemplate);
      fetchTemplates(search);
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError('Failed to duplicate template. Please try again.');
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Assessment Templates</h1>
        <Link 
          href="/dashboard/templates/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FiPlus className="mr-2" /> Create Template
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <FiSearch />
              </span>
              <input
                type="text"
                placeholder="Search templates..."
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              Search
            </button>
          </form>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No templates found. {search ? `No results matching "${search}".` : ''}</p>
            <Link href="/dashboard/templates/new" className="text-blue-600 hover:underline">
              Create your first template
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sections
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          {template.isDefault && (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {template.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.sections}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.questions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.lastUpdated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link 
                          href={`/dashboard/templates/${template.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit className="w-5 h-5" title="Edit" />
                        </Link>
                        <button 
                          onClick={() => handleDuplicateTemplate(template.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <FiCopy className="w-5 h-5" title="Duplicate" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-5 h-5" title="Delete" />
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
    </div>
  );
}

export default function TemplatesListPage() {
  return (
    <Suspense fallback={<TemplatesLoading />}>
      <TemplatesContent />
    </Suspense>
  );
}