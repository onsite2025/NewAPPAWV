'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPrinter, FiDownload, FiMail, FiEdit, FiArrowLeft, FiUser, FiFileText, FiClipboard, FiActivity, FiInfo, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';
import patientService from '@/services/patientService';
import { format } from 'date-fns';

// ErrorBoundary component to catch rendering errors
class ErrorBoundary extends Component<{ children: ReactNode, fallback: ReactNode }> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Report page error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

// Add type definitions for the health plan recommendations
interface HealthPlanRecommendation {
  domain: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  source?: {
    question: string;
    response?: string;
  };
}

// Client props interface
interface VisitReportClientPageProps {
  params?: {
    id: string;
  };
}

// Export the wrapped component
export default function VisitReportClientPage({ params: propParams }: VisitReportClientPageProps) {
  const routeParams = useParams();
  const router = useRouter();
  
  // Use provided params from server component or params from router
  const params = propParams || routeParams;
  const visitId = typeof params?.id === 'string' ? params.id : 
                 Array.isArray(params?.id) ? params.id[0] : '';
  
  return (
    <ErrorBoundary fallback={
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="text-lg font-bold mb-2">Error Loading Report</h2>
          <p>There was a problem loading this report. This might be due to missing or invalid data.</p>
          <div className="mt-4">
            <Link href="/dashboard/visits" className="text-blue-600 hover:underline">
              Return to visits
            </Link>
          </div>
        </div>
      </div>
    }>
      <VisitReportInner visitId={visitId} />
    </ErrorBoundary>
  );
}

// Main Report Component
function VisitReportInner({ visitId }: { visitId: string }) {
  const router = useRouter();
  
  const [visit, setVisit] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // State for PDF modules
  const [pdfModules, setPdfModules] = useState<{
    jspdf: any | null;
    html2canvas: any | null;
  }>({
    jspdf: null,
    html2canvas: null
  });
  
  // Load PDF modules on client side only
  useEffect(() => {
    const loadPdfModules = async () => {
      try {
        const [jspdfModule, html2canvasModule] = await Promise.all([
          import('jspdf'),
          import('html2canvas')
        ]);
        
        setPdfModules({
          jspdf: jspdfModule.default,
          html2canvas: html2canvasModule.default
        });
      } catch (err) {
        console.error('Error loading PDF modules:', err);
      }
    };
    
    loadPdfModules();
  }, []);
  
  useEffect(() => {
    const fetchVisitData = async () => {
      if (!visitId) {
        setError('Invalid visit ID');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch visit data
        const visitResponse = await visitService.getVisitById(visitId);
        
        if (!visitResponse) {
          setError('Visit not found');
          setIsLoading(false);
          return;
        }
        
        // Handle nested response structure (success: true, data: {...})
        const visitData = visitResponse.data || visitResponse;
        
        // Make sure we have a valid visit
        if (!visitData || !visitData._id) {
          setError('Invalid visit data structure');
          setIsLoading(false);
          return;
        }
        
        setVisit(visitResponse); // Keep original structure for consistency
        
        // Fetch template if available
        if (visitData.templateId) {
          try {
            const templateData = await templateService.getTemplateById(visitData.templateId);
            if (templateData) {
            setTemplate(templateData);
            }
          } catch (err) {
            console.error('Error fetching template:', err);
            // Continue without template - non-critical
          }
        }
        
        // Fetch patient details if not populated
        if (visitData.patient) {
          if (typeof visitData.patient === 'object' && visitData.patient !== null) {
          setPatient(visitData.patient);
          } else if (typeof visitData.patient === 'string') {
          try {
            const patientData = await patientService.getPatientById(visitData.patient);
              if (patientData) {
            setPatient(patientData);
              }
          } catch (err) {
            console.error('Error fetching patient:', err);
              // Continue without patient details - non-critical
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching visit:', err);
        setError(`Failed to load visit details: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVisitData();
  }, [visitId]);
  
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };
  
  const handleDownloadPDF = async () => {
    if (!reportRef.current || !pdfModules.jspdf || !pdfModules.html2canvas) {
      alert('PDF generation is still loading. Please try again in a moment.');
      return;
    }
    
    try {
      setGeneratingPDF(true);
      const reportElement = reportRef.current;
      
      // Set a temporary class for PDF generation
      reportElement.classList.add('generating-pdf');
      
      // Capture the content as canvas
      const canvas = await pdfModules.html2canvas(reportElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false
      });
      
      // Remove temporary class
      reportElement.classList.remove('generating-pdf');
      
      // Get the canvas dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      
      // Initialize PDF - use proper constructor with options object
      const pdf = new pdfModules.jspdf({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save the PDF
      pdf.save(`Visit_Report_${visitId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  const handleEmailReport = () => {
    // This would require backend implementation
    alert('Email functionality would need to be implemented on the server-side.');
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 'N/A';
    
    try {
      const birthDate = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return `${age} years`;
    } catch (e) {
      return 'N/A';
    }
  };

  // Render the rest of the component...
  // Include all the rendering logic from the original component
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="card">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <div className="mt-4">
          <Link href="/dashboard/visits" className="text-blue-600 hover:underline">
            Return to visits
          </Link>
        </div>
      </div>
    );
  }
  
  // Return the visit report UI here
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/dashboard/visits/${visitId}`}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FiArrowLeft className="mr-1" /> Back to Visit
        </Link>
        
        <div className="flex space-x-2">
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center"
            disabled={isPrinting}
          >
            <FiPrinter className="mr-1" /> Print
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="btn-secondary flex items-center"
            disabled={generatingPDF || !pdfModules.jspdf}
          >
            <FiDownload className="mr-1" /> 
            {generatingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          
          <button
            onClick={handleEmailReport}
            className="btn-secondary flex items-center"
          >
            <FiMail className="mr-1" /> Email
          </button>
        </div>
      </div>
      
      <div ref={reportRef} className={`report-container ${isPrinting ? 'printing' : ''}`}>
        {/* Visit report content would go here based on the visit data */}
        <h1 className="text-3xl font-bold mb-6">Visit Report</h1>
        
        {/* Display visit and patient information */}
        {/* This would be completed with all the rendered content from the original component */}
      </div>
    </div>
  );
} 