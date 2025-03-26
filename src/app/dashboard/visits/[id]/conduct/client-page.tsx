'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiSave, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';
import { v4 as uuidv4 } from 'uuid';
import ErrorBoundary from '@/components/ErrorBoundary';

// Import all the types and logic from the original file

// Client component for conducting visits
export default function ConductVisitClientPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [visit, setVisit] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  
  useEffect(() => {
    // Fetch visit and template data
    fetchVisitData();
  }, [params.id]);
  
  const fetchVisitData = async () => {
    try {
      setIsLoading(true);
      
      // Get visit data
      const visitData = await visitService.getVisitById(params.id);
      if (!visitData) {
        throw new Error('Visit not found');
      }
      
      setVisit(visitData);
      
      // Load responses if they exist
      if (visitData.responses) {
        setResponses(visitData.responses);
      }
      
      // Load completed sections if they exist
      if (visitData.completedSections) {
        setCompletedSections(visitData.completedSections);
      }
      
      // Get template data
      const templateData = await templateService.getTemplateById(visitData.templateId);
      if (!templateData) {
        throw new Error('Template not found');
      }
      
      setTemplate(templateData);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load visit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Update visit with responses
      await visitService.updateVisit(params.id, {
        responses,
        completedSections,
        status: 'in-progress'
      });
      
      // Refresh data
      await fetchVisitData();
    } catch (err: any) {
      console.error('Error saving visit:', err);
      setError(err.message || 'Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleComplete = async () => {
    try {
      setIsSaving(true);
      
      // Mark visit as completed
      await visitService.updateVisit(params.id, {
        responses,
        completedSections,
        status: 'completed'
      });
      
      // Redirect to visit details
      router.push(`/dashboard/visits/${params.id}`);
    } catch (err: any) {
      console.error('Error completing visit:', err);
      setError(err.message || 'Failed to complete visit. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md">
        <p>{error}</p>
        <div className="mt-4">
          <Link href="/dashboard/visits" className="text-blue-600 hover:underline">
            Back to Visits
          </Link>
        </div>
      </div>
    );
  }
  
  // Display basic conduct interface - implement your specific UI here
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conduct Visit: {visit?.patientName}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            <FiSave /> Save Progress
          </button>
        </div>
      </div>
      
      {template && template.sections && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {template.sections[currentSectionIndex]?.title || 'Section'}
              </h2>
              <div className="text-sm text-gray-500">
                Section {currentSectionIndex + 1} of {template.sections.length}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Form content would go here */}
            <p>This is a simplified version. Implement the full form content based on your template structure.</p>
          </div>
          
          <div className="border-t p-4 flex justify-between">
            <button
              onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
              disabled={currentSectionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              <FiChevronLeft /> Previous
            </button>
            
            {currentSectionIndex < template.sections.length - 1 ? (
              <button
                onClick={() => setCurrentSectionIndex(currentSectionIndex + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Next <FiChevronRight />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded"
              >
                <FiCheckCircle /> Complete Visit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 