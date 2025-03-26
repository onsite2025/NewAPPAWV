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

// Export the wrapped component
export default function VisitReportPageWrapper() {
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
      <VisitReportPage />
    </ErrorBoundary>
  );
}

// Main Report Component
function VisitReportPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
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
      return format(new Date(dateString), 'MMMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const calculateAge = (birthdate: string) => {
    if (!birthdate) return 'N/A';
    
    try {
      const today = new Date();
      const birthDate = new Date(birthdate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };
  
  // Format the recommendations and health plan content for the report
  const renderHealthPlan = () => {
    // First check if visit has nested data structure (success: true, data: {...})
    const visitData = visit.data || visit;
    
    // Ensure visit exists and has expected properties to prevent client-side exceptions
    if (!visitData || !visitData.healthPlan || !Array.isArray(visitData.healthPlan.recommendations) || visitData.healthPlan.recommendations.length === 0) {
      return (
        <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-2 text-primary-700 flex items-center">
            <FiActivity className="mr-2" /> Health Plan
          </h2>
          <p className="text-gray-600 italic">No specific health recommendations at this time.</p>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b text-primary-700 flex items-center">
          <FiActivity className="mr-2" /> Personalized Health Plan
        </h2>
        
        {visitData.healthPlan.summary && (
          <div className="mb-6 p-5 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
              <FiInfo className="mr-1" /> Summary
            </h3>
            <p className="text-blue-900">{visitData.healthPlan.summary}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visitData.healthPlan.recommendations.map((rec: any, index: number) => {
            // Safety check for malformed recommendation
            if (!rec || typeof rec !== 'object') {
              return null;
            }
            
            const priority = rec.priority?.toLowerCase() || 'medium';
            
            const priorityColors = {
              high: {
                border: 'border-red-500',
                bg: 'bg-red-50',
                badge: 'bg-red-100 text-red-800',
                icon: <FiAlertCircle className="w-5 h-5 text-red-600 mr-2" />
              },
              medium: {
                border: 'border-yellow-500',
                bg: 'bg-yellow-50',
                badge: 'bg-yellow-100 text-yellow-800',
                icon: <FiAlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              },
              low: {
                border: 'border-green-500',
                bg: 'bg-green-50',
                badge: 'bg-green-100 text-green-800',
                icon: <FiInfo className="w-5 h-5 text-green-600 mr-2" />
              }
            };
            
            // Safely access colors with fallback
            const colors = priorityColors[priority as keyof typeof priorityColors] || priorityColors.medium;
            
            return (
              <div 
                key={index} 
                className={`p-4 rounded-lg shadow-sm ${colors.bg} border-l-4 ${colors.border}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 flex items-center">
                    {colors.icon}
                    {rec.domain || 'General'}
                  </h4>
                  <span className={`text-xs font-bold rounded-full px-3 py-1 uppercase ${colors.badge}`}>
                    {priority}
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{rec.text || 'No recommendation text'}</p>
                {rec.source && (
                  <div className="text-sm text-gray-500 mt-2 border-t pt-2 border-gray-200">
                    <div>Based on: <span className="font-medium">{rec.source.question || 'Assessment'}</span></div>
                    {rec.source.response && (
                      <div className="text-xs italic mt-1">Response: {rec.source.response}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
  
  // Use visitData consistently for accessing properties
  const visitData = visit.data || visit;
  
  // Prepare patient name
  const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown Patient';
  const patientDOB = patient?.dateOfBirth || null;
  const patientAge = patientDOB ? calculateAge(patientDOB) : 'N/A';
  
  // Prepare provider name
  const providerName = typeof visitData.provider === 'object' && visitData.provider !== null
    ? `${visitData.provider.firstName || ''} ${visitData.provider.lastName || ''}`.trim() || 'Unknown Provider'
    : 'Unknown Provider';
  
  // Get template name
  const templateName = template?.name || 'Visit Assessment';
  
  // Organize responses into sections (if available)
  const organizedResponses = [];
  if (visitData.responses && template?.sections) {
    for (const section of template.sections) {
      const sectionResponses = [];
      
      for (const question of section.questions) {
        if (visitData.responses[question.id]) {
          // Find the matching option for the response to get the label
          let formattedResponse = visitData.responses[question.id];
          let recommendation = '';
          
          // Handle specialized question types
          if (question.type === 'bmi') {
            // Format BMI result
            const bmiValue = visitData.responses[question.id];
            const bmiCategory = visitData.responses[`${question.id}_category`];
            formattedResponse = `BMI: ${bmiValue} (${bmiCategory})`;
            
            // Add recommendation based on BMI value
            recommendation = getBMIRecommendation(parseFloat(bmiValue));
          } 
          else if (question.type === 'vitalSigns') {
            // Format vital signs
            const systolic = visitData.responses[`${question.id}_systolic`];
            const diastolic = visitData.responses[`${question.id}_diastolic`];
            const heartRate = visitData.responses[`${question.id}_heartRate`];
            
            let vitalSignsText = `BP: ${systolic}/${diastolic} mmHg, HR: ${heartRate} bpm`;
            
            // Add additional vital signs if available
            if (visitData.responses[`${question.id}_respiratoryRate`]) {
              vitalSignsText += `, RR: ${visitData.responses[`${question.id}_respiratoryRate`]} breaths/min`;
            }
            if (visitData.responses[`${question.id}_temperature`]) {
              vitalSignsText += `, Temp: ${visitData.responses[`${question.id}_temperature`]}°F`;
            }
            if (visitData.responses[`${question.id}_oxygenSaturation`]) {
              vitalSignsText += `, O2: ${visitData.responses[`${question.id}_oxygenSaturation`]}%`;
            }
            
            formattedResponse = vitalSignsText;
            
            // Generate recommendation based on vital signs
            recommendation = getVitalSignsRecommendation(
              parseFloat(systolic), 
              parseFloat(diastolic), 
              parseFloat(heartRate)
            );
          }
          else if (question.type === 'phq2') {
            // Format PHQ-2 result
            const score = visitData.responses[question.id];
            const risk = visitData.responses[`${question.id}_risk`];
            formattedResponse = `Score: ${score}/6 (Risk: ${risk})`;
            
            if (risk === 'High') {
              recommendation = 'Consider further assessment with PHQ-9 and referral to mental health services.';
            } else {
              recommendation = 'Continue monitoring for depression symptoms at future visits.';
            }
          }
          else if (question.type === 'cognitiveAssessment') {
            // Format cognitive assessment result
            const score = visitData.responses[question.id];
            const risk = visitData.responses[`${question.id}_risk`];
            const testType = question.config?.subtype === 'mmse' ? 'MMSE' : 'MoCA';
            formattedResponse = `${testType} Score: ${score}/30 (Risk: ${risk})`;
            
            if (risk === 'High') {
              recommendation = 'Results indicate potential cognitive impairment. Consider referral for comprehensive neuropsychological testing.';
            } else {
              recommendation = 'Cognitive function appears normal. Continue monitoring at future visits.';
            }
          }
          else if (question.type === 'cageScreening') {
            // Format CAGE result
            const score = visitData.responses[question.id];
            const risk = visitData.responses[`${question.id}_risk`];
            formattedResponse = `Score: ${score}/4 (Risk: ${risk})`;
            
            if (risk === 'High') {
              recommendation = 'Results suggest potential alcohol problem. Consider referral for alcohol abuse assessment and counseling.';
            } else {
              recommendation = 'Continue monitoring alcohol use at future visits.';
            }
          }
          else if (question.type === 'multipleChoice' || question.type === 'boolean') {
            // Handle different response types for multiple choice questions
            if (Array.isArray(formattedResponse)) {
              // For checkbox-type questions
              const selectedOptions = formattedResponse.map(respId => {
                const option = question.options?.find((opt: any) => opt.value === respId || opt.id === respId);
                return option ? option.label || option.text : respId;
              });
              formattedResponse = selectedOptions.join(', ');
              
              // Collect recommendations from all selected options
              const recommendations = [];
              for (const respId of visitData.responses[question.id]) {
                const option = question.options?.find((opt: any) => opt.value === respId || opt.id === respId);
                if (option && option.recommendation) {
                  recommendations.push(option.recommendation);
                }
              }
              if (recommendations.length > 0) {
                recommendation = recommendations.join('\n');
              }
            } else {
              // For radio/select-type questions
              const option = question.options?.find((opt: any) => opt.value === formattedResponse || opt.id === formattedResponse);
              if (option) {
                formattedResponse = option.label || option.text;
                recommendation = option.recommendation || '';
              }
            }
          }
          
          sectionResponses.push({
            question: question.text,
            response: formattedResponse,
            recommendation: recommendation || question.recommendation || ''
          });
        }
      }
      
      if (sectionResponses.length > 0) {
        organizedResponses.push({
          section: section.title,
          responses: sectionResponses
        });
      }
    }
  }
  
  // Helper functions for recommendations
  function getBMIRecommendation(bmi: number): string {
    if (bmi < 18.5) {
      return 'BMI is below normal range. Consider nutrition counseling to achieve healthy weight.';
    } else if (bmi < 25) {
      return 'BMI is within normal range. Continue maintaining healthy diet and exercise habits.';
    } else if (bmi < 30) {
      return 'BMI indicates overweight. Recommend lifestyle modifications including increased physical activity and dietary changes.';
    } else {
      return 'BMI indicates obesity. Recommend comprehensive weight management program, including nutrition counseling, regular exercise, and possibly referral to weight management specialist.';
    }
  }
  
  function getVitalSignsRecommendation(systolic: number, diastolic: number, heartRate: number): string {
    let recommendations = [];
    
    // Blood pressure recommendations
    if (systolic >= 180 || diastolic >= 120) {
      recommendations.push('Blood pressure indicates hypertensive crisis. Immediate medical attention recommended.');
    } else if (systolic >= 140 || diastolic >= 90) {
      recommendations.push('Blood pressure indicates hypertension. Follow-up with primary care provider recommended.');
    } else if (systolic >= 130 || diastolic >= 80) {
      recommendations.push('Blood pressure indicates elevated/stage 1 hypertension. Lifestyle modifications recommended.');
    }
    
    // Heart rate recommendations
    if (heartRate > 100) {
      recommendations.push('Heart rate is elevated. Monitor for symptoms and consider evaluation if persistent.');
    } else if (heartRate < 60) {
      recommendations.push('Heart rate is below normal range. Consider evaluation if symptomatic.');
    }
    
    return recommendations.length > 0 ? recommendations.join(' ') : 'Vital signs are within normal ranges.';
  }
  
  return (
    <div className={`container mx-auto p-4 ${isPrinting ? 'print-mode' : ''}`}>
      <div className="hidden-print mb-6 print:hidden">
        <div className="flex justify-between items-center">
          <Link href={`/dashboard/visits/${visitId}`} className="btn-ghost">
            <FiArrowLeft className="h-4 w-4 mr-1" /> Back to Visit
          </Link>
          
        <div className="flex space-x-2">
            <button onClick={handlePrint} className="btn-secondary">
              <FiPrinter className="h-4 w-4 mr-1" /> Print
          </button>
            
            <button 
              onClick={handleDownloadPDF} 
              className="btn-primary"
              disabled={generatingPDF || !pdfModules.jspdf || !pdfModules.html2canvas}
            >
              {generatingPDF 
                ? <>Generating...</>
                : <><FiDownload className="h-4 w-4 mr-1" /> Download PDF</>
              }
          </button>
            
            <button onClick={handleEmailReport} className="btn-ghost">
              <FiMail className="h-4 w-4 mr-1" /> Email
          </button>
          </div>
        </div>
      </div>
      
      <div className="report-content" ref={reportRef}>
        <div className="p-6 print:p-0 bg-white rounded-lg shadow-md print:shadow-none">
          {/* Header */}
          <div className="mb-8 border-b pb-6 border-gray-200">
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold mb-2 text-primary-600">Health Assessment Report</h1>
              <p className="text-gray-600">Visit Date: {formatDate(visitData.scheduledDate)}</p>
            </div>
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mt-6">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center">
                  <FiUser className="text-primary-500 mr-3 h-6 w-6" />
                  <div>
                    <div className="text-sm text-gray-600 uppercase tracking-wide">Patient</div>
                    <div className="font-medium text-lg">
                      {patientName}
                      {patientAge !== 'N/A' && (
                        <span className="ml-2 text-gray-600">({patientAge} years)</span>
                      )}
                    </div>
            </div>
          </div>
        </div>
        
              <div className="flex items-center">
                {visitData.status && (
                  <div className="mr-6">
                    <div className="text-sm text-gray-600 uppercase tracking-wide">Status</div>
                    <div className={`font-medium capitalize ${
                      visitData.status === 'completed' ? 'text-green-600' : 
                      visitData.status === 'scheduled' ? 'text-blue-600' : 
                      visitData.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {visitData.status}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide">Provider</div>
                  <div className="font-medium">
                    {visitData.provider?.firstName && visitData.provider?.lastName
                      ? `${visitData.provider.firstName} ${visitData.provider.lastName}`
                      : 'Not assigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Assessment Template Information */}
          {template && (
            <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold mb-2 text-primary-700 flex items-center">
                <FiFileText className="mr-2" /> Assessment: {template.name}
              </h2>
              {template.description && (
                <p className="text-gray-600 mt-1 italic">{template.description}</p>
              )}
            </div>
          )}
          
          {/* Health Plan - Placed prominently near the top */}
          {renderHealthPlan()}
          
          {/* Assessment Findings */}
          {template && visitData.responses && Object.keys(visitData.responses).length > 0 && (
          <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 pb-2 border-b text-primary-700 flex items-center">
                <FiClipboard className="mr-2" /> Assessment Findings
              </h2>
            
            <div className="space-y-6">
                {template.sections.map((section: any) => {
                  // Check if there are any responses for this section
                  const sectionQuestionIds = section.questions.map((q: any) => q.id);
                  const sectionHasResponses = sectionQuestionIds.some((id: string) => visitData.responses[id] !== undefined);
                  
                  if (!sectionHasResponses) {
                    return null;
                  }
                  
                  return (
                    <div key={section.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold mb-3 text-primary-600 flex items-center">
                        <span className="w-2 h-6 bg-primary-500 rounded-full mr-2"></span>
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-gray-600 text-sm mb-4">{section.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.questions.map((question: any) => {
                          if (visitData.responses[question.id] === undefined) {
                            return null;
                          }
                          
                          let responseDisplay;
                          const response = visitData.responses[question.id];
                          
                          if (question.type === 'multipleChoice' && question.options) {
                            if (Array.isArray(response)) {
                              // Multiple selection
                              const selectedOptions = question.options
                                .filter((opt: any) => response.includes(opt.value))
                                .map((opt: any) => opt.label);
                              responseDisplay = selectedOptions.join(', ');
                            } else {
                              // Single selection
                              const selectedOption = question.options.find((opt: any) => opt.value === response);
                              responseDisplay = selectedOption ? selectedOption.label : response;
                            }
                          } else if (question.type === 'boolean') {
                            responseDisplay = response === true || response === 'true' ? 'Yes' : 'No';
                          } else if (question.type === 'bmi' && typeof response === 'object') {
                            responseDisplay = `BMI: ${response.value} (${response.category})`;
                          } else if (question.type === 'vitalSigns' && typeof response === 'object') {
                            const vitals = [];
                            if (response.systolic && response.diastolic) {
                              vitals.push(`Blood Pressure: ${response.systolic}/${response.diastolic} mmHg`);
                            }
                            if (response.heartRate) {
                              vitals.push(`Heart Rate: ${response.heartRate} bpm`);
                            }
                            if (response.temperature) {
                              vitals.push(`Temperature: ${response.temperature}° ${response.temperatureUnit || 'C'}`);
                            }
                            if (response.respiratoryRate) {
                              vitals.push(`Respiratory Rate: ${response.respiratoryRate} bpm`);
                            }
                            if (response.oxygenSaturation) {
                              vitals.push(`Oxygen Saturation: ${response.oxygenSaturation}%`);
                            }
                            responseDisplay = vitals.join(', ');
                          } else {
                            responseDisplay = String(response);
                          }
                          
                          return (
                            <div key={question.id} className="bg-gray-50 p-3 rounded-md shadow-sm">
                              <div className="font-medium text-gray-800">{question.text}</div>
                              <div className="mt-1 text-gray-700">{responseDisplay}</div>
                            </div>
                          );
                        })}
                        </div>
                    </div>
                  );
                })}
                  </div>
            </div>
          )}
          
          {/* Visit notes */}
          {visitData.notes && (
            <div className="mb-8 p-5 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold mb-2 text-primary-700 flex items-center">
                <FiEdit className="mr-2" /> Provider Notes
              </h2>
              <p className="whitespace-pre-line mt-2 text-gray-800">{visitData.notes}</p>
          </div>
        )}
        
          <div className="text-center mt-8 text-sm text-gray-500 pt-4 border-t border-gray-200">
            <p>Report generated on {new Date().toLocaleDateString()}</p>
            <p className="mt-1">This report is for informational purposes only. Please consult with your healthcare provider for any medical advice.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 