'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiCalendar, FiClock, FiUser, FiFileText, FiClipboard, FiEdit, FiDownload, FiTrash2 } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';
import { format } from 'date-fns';

export default function VisitDetailClientPage({ params: propParams }) {
  const params = useParams() || propParams;
  const router = useRouter();
  const visitId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const [visit, setVisit] = useState(null);
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisitAndTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch visit data
        const visitData = await visitService.getVisitById(visitId);
        console.log('Visit data loaded:', visitData);
        
        if (!visitData || !visitData._id) {
          return (
            <div className="flex flex-col items-center justify-center h-full w-full p-4">
              <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Visit Not Found</h1>
                <p className="text-gray-600 mb-6">
                  The visit you are looking for could not be found or may have been deleted.
                </p>
                <Link href="/dashboard/visits" className="btn-primary">
                  Return to Visits
                </Link>
              </div>
            </div>
          );
        }
        
        setVisit(visitData);
        
        // Fetch template data if available
        if (visitData.templateId) {
          try {
            const templateData = await templateService.getTemplateById(visitData.templateId);
            setTemplate(templateData);
          } catch (err) {
            console.error('Error fetching template:', err);
            // Don't set error since the visit might still be viewable
          }
        }
      } catch (err) {
        console.error('Error fetching visit:', err);
        setError('Failed to load visit details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVisitAndTemplate();
  }, [visitId]);

  const handleDelete = async () => {
    // Change confirmation message based on visit status
    const confirmMessage = visit?.status === 'completed' 
      ? 'Are you sure you want to delete this completed visit? All data including assessment results and health plan will be permanently deleted.'
      : 'Are you sure you want to cancel this visit? This action cannot be undone.';
      
    if (window.confirm(confirmMessage)) {
      try {
        setIsDeleting(true);
        await visitService.deleteVisit(visitId);
        router.push('/dashboard/visits');
      } catch (err) {
        console.error('Error deleting visit:', err);
        setError(`Failed to ${visit?.status === 'completed' ? 'delete' : 'cancel'} visit`);
        setIsDeleting(false);
      }
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge-success">Completed</span>;
      case 'scheduled':
        return <span className="badge-primary">Scheduled</span>;
      case 'in-progress':
        return <span className="badge-warning">In Progress</span>;
      case 'cancelled':
        return <span className="badge-danger">Canceled</span>;
      default:
        return <span className="badge-secondary">{status}</span>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="card mb-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
        <button 
          onClick={() => router.push('/dashboard/visits')}
          className="btn-primary mt-4"
        >
          Back to Visits
        </button>
      </div>
    );
  }
  
  if (!visit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Visit Not Found</h2>
        <p className="text-gray-600 mb-6">The visit you're looking for doesn't exist or has been removed.</p>
        <Link href="/dashboard/visits" className="btn-primary">
          Back to Visits
        </Link>
      </div>
    );
  }
  
  const patientName = typeof visit.patient === 'object' && visit.patient !== null
    ? `${visit.patient.firstName || ''} ${visit.patient.lastName || ''}`.trim() || 'Unknown Patient'
    : 'Unknown Patient';
    
  const providerName = typeof visit.provider === 'object' && visit.provider !== null
    ? `${visit.provider.firstName || ''} ${visit.provider.lastName || ''}`.trim() || 'Unknown Provider'
    : 'Unknown Provider';
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Visit Details</h1>
        <div className="flex space-x-2">
          {visit.status === 'scheduled' && (
            <Link href={`/dashboard/visits/${visitId}/conduct`} className="btn-primary">
              Start Visit
            </Link>
          )}
          {visit.status === 'in-progress' && (
            <Link href={`/dashboard/visits/${visitId}/conduct`} className="btn-warning">
              Continue Visit
            </Link>
          )}
          {visit.status === 'completed' && (
            <Link href={`/dashboard/visits/${visitId}/report`} className="btn-secondary">
              View Report
            </Link>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">{template?.name || 'Visit'}</h2>
                <div className="flex items-center mt-2 mb-4">
                  {getStatusBadge(visit.status)}
                </div>
              </div>
              <div>
                {(visit.status === 'scheduled' || visit.status === 'in-progress') && (
                  <button
                    onClick={handleDelete}
                    className="btn-danger"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Canceling...' : 'Cancel Visit'}
                  </button>
                )}
                {visit.status === 'completed' && (
                  <button
                    onClick={handleDelete}
                    className="btn-danger flex items-center"
                    disabled={isDeleting}
                  >
                    <FiTrash2 className="mr-1" /> {isDeleting ? 'Deleting...' : 'Delete Visit'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center mb-3">
                  <FiCalendar className="text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-600">Date & Time</div>
                    <div>{formatDate(visit.scheduledDate)}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center mb-3">
                  <FiUser className="text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-600">Patient</div>
                    <div>{patientName}</div>
                  </div>
                </div>
                
                <div className="flex items-center mb-3">
                  <FiFileText className="text-gray-500 mr-2" />
                  <div>
                    <div className="text-sm text-gray-600">Assessment Template</div>
                    <div>{template?.name || 'Standard Assessment'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 