'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPrinter, FiDownload, FiMail, FiEdit, FiArrowLeft, FiUser } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';
import patientService from '@/services/patientService';
import { format } from 'date-fns';

// Remove dynamic imports that are causing linter errors
export default function VisitReportPage() {
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
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch visit data
        const visitData = await visitService.getVisitById(visitId);
        setVisit(visitData);
        
        // Fetch template if available
        if (visitData.templateId) {
          try {
            const templateData = await templateService.getTemplateById(visitData.templateId);
            setTemplate(templateData);
          } catch (err) {
            console.error('Error fetching template:', err);
          }
        }
        
        // Fetch patient details if not populated
        if (visitData.patient && typeof visitData.patient === 'object') {
          setPatient(visitData.patient);
        } else if (visitData.patient) {
          try {
            const patientData = await patientService.getPatientById(visitData.patient);
            setPatient(patientData);
          } catch (err) {
            console.error('Error fetching patient:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching visit:', err);
        setError('Failed to load visit details');
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
  
  // Prepare patient name
  const patientName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : 'Unknown Patient';
  const patientDOB = patient?.dateOfBirth || null;
  const patientAge = patientDOB ? calculateAge(patientDOB) : 'N/A';
  
  // Prepare provider name
  const providerName = typeof visit.provider === 'object' && visit.provider !== null
    ? `${visit.provider.firstName || ''} ${visit.provider.lastName || ''}`.trim() || 'Unknown Provider'
    : 'Unknown Provider';
  
  // Get template name
  const templateName = template?.name || 'Visit Assessment';
  
  // Organize responses into sections (if available)
  const organizedResponses = [];
  if (visit.responses && template?.sections) {
    for (const section of template.sections) {
      const sectionResponses = [];
      
      for (const question of section.questions) {
        if (visit.responses[question.id]) {
          // Find the matching option for the response to get the label
          let formattedResponse = visit.responses[question.id];
          let recommendation = '';
          
          // Handle specialized question types
          if (question.type === 'bmi') {
            // Format BMI result
            const bmiValue = visit.responses[question.id];
            const bmiCategory = visit.responses[`${question.id}_category`];
            formattedResponse = `BMI: ${bmiValue} (${bmiCategory})`;
            recommendation = getBMIRecommendation(bmiValue);
          } 
          else if (question.type === 'vitalSigns') {
            // Format vital signs
            const systolic = visit.responses[`${question.id}_systolic`];
            const diastolic = visit.responses[`${question.id}_diastolic`];
            const heartRate = visit.responses[`${question.id}_heartRate`];
            
            let vitalSignsText = `BP: ${systolic}/${diastolic} mmHg, HR: ${heartRate} bpm`;
            
            // Add additional vital signs if available
            if (visit.responses[`${question.id}_respiratoryRate`]) {
              vitalSignsText += `, RR: ${visit.responses[`${question.id}_respiratoryRate`]} breaths/min`;
            }
            if (visit.responses[`${question.id}_temperature`]) {
              vitalSignsText += `, Temp: ${visit.responses[`${question.id}_temperature`]}°F`;
            }
            if (visit.responses[`${question.id}_oxygenSaturation`]) {
              vitalSignsText += `, O2: ${visit.responses[`${question.id}_oxygenSaturation`]}%`;
            }
            
            formattedResponse = vitalSignsText;
            recommendation = getVitalSignsRecommendation(systolic, diastolic, heartRate);
          }
          else if (question.type === 'phq2') {
            // Format PHQ-2 result
            const score = visit.responses[question.id];
            const risk = visit.responses[`${question.id}_risk`];
            formattedResponse = `Score: ${score}/6 (Risk: ${risk})`;
            
            if (risk === 'High') {
              recommendation = 'Consider further assessment with PHQ-9 and referral to mental health services.';
            } else {
              recommendation = 'Continue monitoring for depression symptoms at future visits.';
            }
          }
          else if (question.type === 'cognitiveAssessment') {
            // Format cognitive assessment result
            const score = visit.responses[question.id];
            const risk = visit.responses[`${question.id}_risk`];
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
            const score = visit.responses[question.id];
            const risk = visit.responses[`${question.id}_risk`];
            formattedResponse = `Score: ${score}/4 (Risk: ${risk})`;
            
            if (risk === 'High') {
              recommendation = 'Results suggest potential alcohol problem. Consider referral for alcohol abuse assessment and counseling.';
            } else {
              recommendation = 'Continue monitoring alcohol use at future visits.';
            }
          }
          else if (question.type === 'multipleChoice' || question.type === 'boolean') {
            if (Array.isArray(formattedResponse)) {
              // For checkbox-type questions
              const selectedOptions = formattedResponse.map(respId => {
                const option = question.options?.find((opt: any) => opt.value === respId || opt.id === respId);
                return option ? option.label || option.text : respId;
              });
              formattedResponse = selectedOptions.join(', ');
              
              // Collect recommendations from all selected options
              const recommendations = [];
              for (const respId of visit.responses[question.id]) {
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
    <div>
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Visit Report</h1>
        <div className="flex space-x-2">
          <button onClick={handlePrint} className="btn-primary flex items-center">
            <FiPrinter className="mr-1" /> {isPrinting ? 'Printing...' : 'Print'}
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center">
            <FiDownload className="mr-1" /> Download PDF
          </button>
          <button onClick={handleEmailReport} className="btn-secondary flex items-center">
            <FiMail className="mr-1" /> Email
          </button>
          <Link href={`/dashboard/visits/${visitId}`} className="btn-secondary flex items-center">
            <FiArrowLeft className="mr-1" /> Back
          </Link>
        </div>
      </div>
      
      <div ref={reportRef} className="mx-auto max-w-4xl bg-white shadow-md rounded-lg p-6 mb-6 print:shadow-none print:p-0">
        <div className="border-b pb-6 mb-6 print:border-b-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-primary-600">{templateName} Report</h2>
              <p className="text-lg text-gray-600">
                {formatDate(visit.scheduledDate)}
              </p>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-800">Healthcare Clinic</div>
              <div className="text-gray-600">123 Health Street</div>
              <div className="text-gray-600">Anytown, CA 12345</div>
              <div className="text-gray-600">(555) 123-4567</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:border-b">Patient Information</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <FiUser className="mr-2 text-gray-400" />
                <div>
                  <div className="font-medium">{patientName}</div>
                  <div className="text-gray-600">
                    DOB: {formatDate(patientDOB)} ({patientAge} years)
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:border-b">Visit Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-600">Provider:</div>
              <div>{providerName}</div>
              
              <div className="text-gray-600">Template:</div>
              <div>{templateName}</div>
              
              <div className="text-gray-600">Date:</div>
              <div>{formatDate(visit.scheduledDate)}</div>
              
              <div className="text-gray-600">Status:</div>
              <div className="capitalize">{visit.status}</div>
            </div>
          </div>
        </div>
        
        {organizedResponses.length > 0 ? (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:border-b">Assessment Results</h3>
            
            <div className="space-y-6">
              {organizedResponses.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h4 className="font-medium text-primary-600 mb-2">{section.section}</h4>
                  <div className="space-y-4">
                    {section.responses.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md border print:border">
                        <div className="font-medium">{item.question}</div>
                        <div className="text-sm text-gray-600 mb-2">
                          Response: {Array.isArray(item.response) ? item.response.join(', ') : item.response}
                        </div>
                        {item.recommendation && (
                          <div className="text-sm bg-blue-50 p-2 rounded border border-blue-100 print:bg-white">
                            <span className="font-medium text-blue-800">Recommendation:</span> {item.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-md border">
            <p className="text-gray-500 italic">No assessment responses recorded for this visit.</p>
          </div>
        )}
        
        {visit.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 border-b pb-2 print:border-b">Visit Notes</h3>
            <div className="p-4 bg-gray-50 rounded-md border">
              <p>{visit.notes}</p>
            </div>
          </div>
        )}
        
        <div className="mt-12 pt-6 border-t text-sm text-gray-500 print:mt-8">
          <p>This report was generated on {format(new Date(), 'MMMM dd, yyyy')} and is for informational purposes only.</p>
          <p>Please consult with your healthcare provider for professional medical advice.</p>
        </div>
      </div>
    </div>
  );
} 