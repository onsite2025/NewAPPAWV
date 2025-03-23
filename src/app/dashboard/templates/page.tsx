'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiEdit, FiCopy, FiTrash2, FiSearch } from 'react-icons/fi';
import { ITemplateResponse } from '@/models/Template';
import templateService from '@/services/templateService';

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

export default function TemplatesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('search') || '';
  
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  useEffect(() => {
    console.log('useEffect triggered with search:', search);
    fetchTemplates(search);
  }, [search]);
  
  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      console.log('Setting up auto-refresh timer');
      const intervalId = setInterval(() => {
        console.log('Auto-refresh triggered, fetching templates with search:', search);
        fetchTemplates(search);
      }, 10000); // Refresh every 10 seconds
      
      return () => {
        console.log('Clearing auto-refresh timer');
        clearInterval(intervalId);
      };
    }
  }, [autoRefresh, search]);
  
  const fetchTemplates = async (search?: string) => {
    setIsLoading(true);
    setError(null);
    console.log('Fetching templates with search:', search);
    try {
      console.log('Calling templateService.getTemplates...');
      const data = await templateService.getTemplates(search);
      console.log('Templates API response:', data);
      console.log('Templates data type:', typeof data, Array.isArray(data));
      
      if (!data || !Array.isArray(data)) {
        console.error('Templates data is not an array:', data);
        setError('Invalid template data received');
        setTemplates([]);
        setIsLoading(false);
        return;
      }
      
      // Map API data to UI template list items
      const templateItems: TemplateListItem[] = data.map((template: ITemplateResponse) => {
        console.log('Processing template:', template);
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
      
      console.log('Processed template items:', templateItems);
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
      console.log('Duplicating template with ID:', id);
      // Fetch the template to duplicate
      const fullTemplate = await templateService.getTemplateById(id);
      
      console.log('Template to duplicate:', fullTemplate);
      if (!fullTemplate) {
        console.error('Template not found for duplication');
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
      
      console.log('Creating duplicated template:', duplicatedTemplate);
      const newTemplate = await templateService.createTemplate(duplicatedTemplate);
      console.log('New template created:', newTemplate);
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
          <div className="flex items-center ml-4">
            <label htmlFor="auto-refresh" className="mr-2 text-sm text-gray-600">Auto-refresh</label>
            <div 
              className={`relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-gray-400'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <input 
                type="checkbox" 
                id="auto-refresh"
                className="opacity-0 w-0 h-0" 
                checked={autoRefresh} 
                onChange={() => setAutoRefresh(!autoRefresh)} 
              />
              <span 
                className={`absolute left-1 top-1 bg-white w-4 h-4 transition duration-200 ease-in-out rounded-full ${autoRefresh ? 'transform translate-x-6' : ''}`}
              ></span>
            </div>
          </div>
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
                          <FiEdit className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => handleDuplicateTemplate(template.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <FiCopy className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-5 h-5" />
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