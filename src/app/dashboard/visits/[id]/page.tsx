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

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const [visit, setVisit] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisitAndTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch visit data
        const visitData = await visitService.getVisitById(visitId);
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
    if (window.confirm('Are you sure you want to cancel this visit? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        await visitService.deleteVisit(visitId);
        router.push('/dashboard/visits');
      } catch (err) {
        console.error('Error deleting visit:', err);
        setError('Failed to delete visit');
        setIsDeleting(false);
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { 
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
  
  const getStatusBadge = (status: string) => {
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
                    <div>{template?.name || 'No template selected'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {visit.notes && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Visit Notes</h3>
              </div>
              <p>{visit.notes}</p>
            </div>
          )}
          
          {visit.responses && Object.keys(visit.responses).length > 0 && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assessment Responses</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(visit.responses).map(([key, value]) => (
                  <div key={key} className="border-b pb-2">
                    <div className="font-medium">{key}</div>
                    <div>{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Display Health Plan */}
          {visit.healthPlan && (
            <div className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Personalized Health Plan</h3>
              </div>
              
              {visit.healthPlan.summary && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-700 mb-2">Summary</h4>
                  <p>{visit.healthPlan.summary}</p>
                </div>
              )}
              
              {visit.healthPlan.recommendations && visit.healthPlan.recommendations.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700 mb-2">Recommendations</h4>
                  
                  {visit.healthPlan.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="border-l-4 pl-4 mb-4 pb-2" 
                      style={{ 
                        borderLeftColor: rec.priority === 'high' 
                          ? '#ef4444' 
                          : rec.priority === 'medium' 
                            ? '#f59e0b' 
                            : '#10b981'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{rec.domain}</div>
                        <div className={`text-xs font-bold rounded-full px-2 py-1 ${
                          rec.priority === 'high' 
                            ? 'bg-red-100 text-red-800' 
                            : rec.priority === 'medium' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} Priority
                        </div>
                      </div>
                      <p className="text-gray-800 mt-1">{rec.text}</p>
                      {rec.source && (
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="font-medium">Source:</span> {rec.source.question}
                          {rec.source.response && ` (${rec.source.response})`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No specific recommendations at this time.</p>
              )}
            </div>
          )}
        </div>
        
        <div>
          <div className="card mb-6">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Patient Info</h3>
            </div>
            
            <div className="border-t pt-4">
              {typeof visit.patient === 'object' && visit.patient !== null ? (
                <div>
                  <h4 className="font-semibold">{patientName}</h4>
                  {visit.patient.dateOfBirth && (
                    <p className="text-gray-600">
                      DOB: {format(new Date(visit.patient.dateOfBirth), 'MMM dd, yyyy')}
                    </p>
                  )}
                  <Link 
                    href={`/dashboard/patients/${visit.patient._id}`}
                    className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
                  >
                    View Patient Record
                  </Link>
                </div>
              ) : (
                <p>Patient information not available</p>
              )}
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold">Visit Actions</h3>
            </div>
            
            <div className="border-t pt-4 space-y-3">
              {visit.status === 'scheduled' && (
                <>
                  <Link href={`/dashboard/visits/${visitId}/conduct`} className="btn-primary w-full block text-center">
                    Start Visit
                  </Link>
                </>
              )}
              
              {visit.status === 'in-progress' && (
                <Link href={`/dashboard/visits/${visitId}/conduct`} className="btn-warning w-full block text-center">
                  Continue Visit
                </Link>
              )}
              
              {visit.status === 'completed' && (
                <>
                  <Link href={`/dashboard/visits/${visitId}/report`} className="btn-secondary w-full block text-center">
                    <FiClipboard className="mr-1 inline" /> View Report
                  </Link>
                  <Link href={`/dashboard/visits/new?patientId=${visit.patient._id}`} className="btn-primary w-full block text-center">
                    Schedule New Visit
                  </Link>
                </>
              )}
              
              {visit.status !== 'completed' && (
                <button onClick={handleDelete} className="btn-danger w-full" disabled={isDeleting}>
                  <FiTrash2 className="mr-1 inline" /> {isDeleting ? 'Canceling...' : 'Cancel Visit'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 