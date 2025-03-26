'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Client component for template editing
export default function EditTemplateClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const isNew = params.id === 'new';

  useEffect(() => {
    // Only fetch existing template if not creating a new one
    if (!isNew) {
      fetchTemplate();
    } else {
      // Initialize with empty template for new creation
      setTemplate({
        name: '',
        description: '',
        sections: [],
        isActive: false,
        version: 1
      });
      setIsLoading(false);
    }
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      setIsLoading(true);
      // Fetch the template data - replace with your actual API call
      const response = await fetch(`/api/templates/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const data = await response.json();
      setTemplate(data);
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load template data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      // Create or update template logic
      const url = isNew ? '/api/templates' : `/api/templates/${params.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save template');
      }
      
      // Redirect back to templates list after save
      router.push('/dashboard/templates');
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (error) {
    return <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md">
      {error}
      <div className="mt-4">
        <Link href="/dashboard/templates" className="text-blue-600 hover:underline">
          Back to Templates
        </Link>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isNew ? 'Create New Template' : 'Edit Template'}
        </h1>
        <Link href="/dashboard/templates" className="text-blue-600 hover:underline">
          Back to Templates
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Template form would go here */}
        <form onSubmit={(e) => {
          e.preventDefault();
          // Sample form submission - replace with actual form data collection
          handleSave({
            name: template.name,
            description: template.description,
            sections: template.sections,
            isActive: template.isActive
          });
        }}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Template Name:
            </label>
            <input 
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={template.name}
              onChange={(e) => setTemplate({...template, name: e.target.value})}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={template.description || ''}
              onChange={(e) => setTemplate({...template, description: e.target.value})}
              rows={3}
            />
          </div>
          
          {/* Add more form fields for template sections and questions */}
          
          <div className="flex items-center justify-end mt-6">
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
              onClick={() => router.push('/dashboard/templates')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
