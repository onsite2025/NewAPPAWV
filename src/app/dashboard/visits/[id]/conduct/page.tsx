'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiSave, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';

// Types and interfaces

interface Option {
  id: string;
  text: string;
  recommendation?: string;
}

interface ConditionalLogic {
  questionId: string;
  value?: string;
  notValue?: string;
}

interface QuestionBase {
  id: string;
  text: string;
  required?: boolean;
  conditional?: ConditionalLogic;
  includeRecommendation?: boolean;
  defaultRecommendation?: string;
}

interface TextQuestion extends QuestionBase {
  type: 'text' | 'textarea';
}

interface SelectQuestion extends QuestionBase {
  type: 'select' | 'radio';
  options: Option[];
}

interface CheckboxQuestion extends QuestionBase {
  type: 'checkbox';
  options: Option[];
}

interface RangeQuestion extends QuestionBase {
  type: 'range';
  min?: number;
  max?: number;
}

type Question = TextQuestion | SelectQuestion | CheckboxQuestion | RangeQuestion;

interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// AWV questionnaire sections
const questionnaireSections: QuestionnaireSection[] = [
  {
    id: 'general-health',
    title: 'General Health',
    description: 'Basic health information and vital signs',
    questions: [
      {
        id: 'general-health-rating',
        text: 'How would you rate your overall health?',
        type: 'select',
        required: true,
        includeRecommendation: true,
        options: [
          { id: 'excellent', text: 'Excellent', recommendation: 'Continue maintaining your excellent health with regular exercise and a balanced diet.' },
          { id: 'very-good', text: 'Very Good', recommendation: 'Your health is very good. Maintain regular check-ups and continue your healthy habits.' },
          { id: 'good', text: 'Good', recommendation: 'Your health is good. Consider increasing physical activity to further improve your health.' },
          { id: 'fair', text: 'Fair', recommendation: 'Your health is fair. We recommend improving your diet and exercise routine. Consider nutritional counseling.' },
          { id: 'poor', text: 'Poor', recommendation: 'Your health rating is concerning. We recommend a comprehensive health check and creating a lifestyle improvement plan.' }
        ]
      },
      {
        id: 'health-changes',
        text: 'Have you experienced any significant health changes in the past year?',
        type: 'radio',
        required: true,
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ]
      },
      {
        id: 'health-changes-description',
        text: 'If yes, please describe:',
        type: 'textarea',
        required: false,
        includeRecommendation: true,
        defaultRecommendation: 'Based on the changes you reported, we recommend scheduling a follow-up visit in 3 months to monitor your progress.',
        conditional: {
          questionId: 'health-changes',
          value: 'yes'
        }
      }
    ]
  },
  {
    id: 'current-symptoms',
    title: 'Current Symptoms',
    description: 'Information about any current symptoms or concerns',
    questions: [
      {
        id: 'pain',
        text: 'Are you currently experiencing any pain?',
        type: 'radio',
        required: true,
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ]
      },
      {
        id: 'pain-level',
        text: 'If yes, rate your pain level (0-10):',
        type: 'range',
        required: false,
        min: 0,
        max: 10,
        includeRecommendation: true,
        defaultRecommendation: 'For your pain level of {value}, we recommend: (1-3) over-the-counter pain relievers as needed, (4-6) scheduling physical therapy evaluation, or (7-10) immediate follow-up appointment to address severe pain.',
        conditional: {
          questionId: 'pain',
          value: 'yes'
        }
      }
    ]
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle and Habits',
    description: 'Information about your lifestyle and habits',
    questions: [
      {
        id: 'exercise-frequency',
        text: 'How frequently do you exercise?',
        type: 'select',
        required: true,
        includeRecommendation: true,
        options: [
          { id: 'daily', text: 'Daily', recommendation: 'Continue your excellent exercise routine. Consider varying your activities to prevent overuse injuries.' },
          { id: '4-6', text: '4-6 times per week', recommendation: 'Your exercise frequency is very good. Maintain this level while ensuring you include both cardiovascular and strength training.' },
          { id: '2-3', text: '2-3 times per week', recommendation: 'Consider increasing your exercise frequency to 4-5 times per week for optimal health benefits.' },
          { id: 'once', text: 'Once per week', recommendation: 'We recommend gradually increasing your exercise to at least 3 times per week for 30 minutes each session.' },
          { id: 'rarely', text: 'Rarely/Never', recommendation: 'Physical activity is essential for health. Start with short daily walks and gradually build up to 150 minutes of moderate activity per week.' }
        ]
      }
    ]
  }
];

export default function ConductVisitPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  const [visit, setVisit] = useState<any>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});
  const [questionnaireSections, setQuestionnaireSections] = useState<QuestionnaireSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchVisitAndTemplate = async () => {
      try {
        setIsLoading(true);
        
        // Fetch visit data
        const visitData = await visitService.getVisitById(visitId);
        setVisit(visitData);
        
        // Set patient name
        if (visitData.patient) {
          const patient = visitData.patient;
          setPatientName(`${patient.firstName || ''} ${patient.lastName || ''}`.trim());
        }
        
        // Load progress if available
        if (visitData.responses) {
          setResponses(visitData.responses || {});
        }
        
        // Fetch template if available
        if (visitData.templateId) {
          try {
            const templateData = await templateService.getTemplateById(visitData.templateId);
            if (templateData) {
              setTemplateName(templateData.name || 'Visit Assessment');
              // Type assertion to ensure compatibility
              setQuestionnaireSections(templateData.sections as unknown as QuestionnaireSection[] || []);
            }
          } catch (err) {
            console.error('Error loading template:', err);
            setError('Failed to load assessment template');
          }
        } else {
          setError('No assessment template associated with this visit');
        }
      } catch (err) {
        console.error('Error loading visit:', err);
        setError('Failed to load visit data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVisitAndTemplate();
  }, [visitId]);
  
  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-set recommendations based on template options
    const currentSection = questionnaireSections[activeSection];
    const question = currentSection.questions.find(q => q.id === questionId);
    
    if (question?.includeRecommendation) {
      let recommendationText = '';
      
      if (question.type === 'select' || question.type === 'radio') {
        // For select/radio, find the matching option and use its recommendation
        const selectedOption = question.options.find(opt => opt.text === value || opt.id === value);
        if (selectedOption?.recommendation) {
          recommendationText = selectedOption.recommendation;
        }
      } else if (question.type === 'checkbox') {
        // For checkboxes, combine recommendations from selected options
        if (Array.isArray(value) && value.length > 0) {
          const selectedRecommendations = value.map(v => {
            const option = question.options.find(opt => opt.text === v || opt.id === v);
            return option?.recommendation || '';
          }).filter(r => r !== '');
          
          recommendationText = selectedRecommendations.join(' ');
        }
      } else if (question.type === 'range') {
        // For range questions, use the default recommendation and replace {value} placeholders
        if (question.defaultRecommendation) {
          recommendationText = question.defaultRecommendation.replace(/\{value\}/g, value.toString());
        }
      } else if (question.defaultRecommendation) {
        // For text/textarea, use the default recommendation
        recommendationText = question.defaultRecommendation;
      }
      
      if (recommendationText) {
        setRecommendations(prev => ({ ...prev, [questionId]: recommendationText }));
      }
    }
  };
  
  const validateSection = (sectionIndex: number) => {
    const section = questionnaireSections[sectionIndex];
    const errors: string[] = [];
    
    section.questions.forEach(question => {
      // Skip validation for conditional questions if condition is not met
      if (question.conditional) {
        const conditionQuestion = question.conditional.questionId;
        const conditionValue = question.conditional.value;
        const notValue = question.conditional.notValue;
        
        if (
          (conditionValue && responses[conditionQuestion] !== conditionValue) ||
          (notValue && responses[conditionQuestion] === notValue)
        ) {
          return;
        }
      }
      
      // Validate required questions
      if (question.required && 
          (responses[question.id] === undefined || 
           responses[question.id] === '' || 
           (Array.isArray(responses[question.id]) && responses[question.id].length === 0))
         ) {
        errors.push(`Question "${question.text}" is required.`);
      }
    });
    
    setFormErrors(errors);
    return errors.length === 0;
  };
  
  const handleSaveProgress = async () => {
    setIsSaving(true);
    
    // In a real app, this would be an API call to save progress
    setTimeout(() => {
      setIsSaving(false);
      // Update completed sections if current section is valid
      const isValid = validateSection(activeSection);
      if (isValid && !completedSections.includes(activeSection)) {
        setCompletedSections(prev => [...prev, activeSection]);
      }
    }, 1000);
  };
  
  const handleNextSection = () => {
    const isValid = validateSection(activeSection);
    
    if (isValid) {
      // Add current section to completed sections if not already added
      if (!completedSections.includes(activeSection)) {
        setCompletedSections(prev => [...prev, activeSection]);
      }
      
      // Move to next section
      if (activeSection < questionnaireSections.length - 1) {
        setActiveSection(activeSection + 1);
        setFormErrors([]);
      }
    }
  };
  
  const handlePrevSection = () => {
    if (activeSection > 0) {
      setActiveSection(activeSection - 1);
      setFormErrors([]);
    }
  };
  
  const handleCompleteVisit = async () => {
    const isValid = validateSection(activeSection);
    
    if (isValid) {
      setIsSaving(true);
      
      // Compile health plan from recommendations
      const healthPlan = Object.entries(recommendations)
        .filter(([_, value]) => value.trim() !== '')
        .map(([questionId, recommendation]) => {
          // Find the question text for this recommendation
          const questionText = findQuestionText(questionId);
          const response = responses[questionId];
          
          return {
            question: questionText,
            response: response,
            recommendation: recommendation
          };
        });
      
      try {
        // Update the visit status to completed and save responses
        await visitService.updateVisit(visitId, {
          status: 'completed',
          responses: responses
        });
        
        setIsSaving(false);
        router.push(`/dashboard/visits/${visitId}/report`);
      } catch (error) {
        console.error('Error completing visit:', error);
        setIsSaving(false);
        alert('Failed to complete visit. Please try again.');
      }
    }
  };
  
  // Helper function to find a question's text by ID
  const findQuestionText = (questionId: string): string => {
    for (const section of questionnaireSections) {
      for (const question of section.questions) {
        if (question.id === questionId) {
          return question.text;
        }
      }
    }
    return 'Unknown Question';
  };
  
  // Render form inputs based on question type
  const renderQuestion = (question: Question) => {
    // Check if this question should be shown based on conditional logic
    if (question.conditional) {
      const conditionQuestion = question.conditional.questionId;
      const conditionValue = question.conditional.value;
      const notValue = question.conditional.notValue;
      
      if (
        (conditionValue && responses[conditionQuestion] !== conditionValue) ||
        (notValue && responses[conditionQuestion] === notValue)
      ) {
        return null;
      }
    }
    
    return (
      <div className="space-y-4">
        {/* Render the appropriate question input based on type */}
        {(() => {
          switch (question.type) {
            case 'text':
              return (
                <input
                  type="text"
                  id={question.id}
                  value={responses[question.id] || ''}
                  onChange={e => handleInputChange(question.id, e.target.value)}
                  className="form-input w-full"
                  required={question.required}
                />
              );
              
            case 'textarea':
              return (
                <textarea
                  id={question.id}
                  value={responses[question.id] || ''}
                  onChange={e => handleInputChange(question.id, e.target.value)}
                  rows={4}
                  className="form-input w-full"
                  required={question.required}
                />
              );
              
            case 'select':
              return (
                <select
                  id={question.id}
                  value={responses[question.id] || ''}
                  onChange={e => handleInputChange(question.id, e.target.value)}
                  className="form-input w-full"
                  required={question.required}
                >
                  <option value="">Select an option</option>
                  {question.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.text}
                    </option>
                  ))}
                </select>
              );
              
            case 'radio':
              return (
                <div className="flex flex-col space-y-2">
                  {question.options.map((option) => (
                    <label key={option.id} className="inline-flex items-center">
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={responses[question.id] === option.id}
                        onChange={e => handleInputChange(question.id, e.target.value)}
                        className="form-radio"
                        required={question.required}
                      />
                      <span className="ml-2">{option.text}</span>
                    </label>
                  ))}
                </div>
              );
              
            case 'checkbox':
              return (
                <div className="flex flex-col space-y-2">
                  {question.options.map((option) => (
                    <label key={option.id} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        value={option.id}
                        checked={Array.isArray(responses[question.id]) && responses[question.id]?.includes(option.id)}
                        onChange={e => {
                          const currentValues = Array.isArray(responses[question.id]) ? [...responses[question.id]] : [];
                          
                          if (e.target.checked) {
                            handleInputChange(question.id, [...currentValues, option.id]);
                          } else {
                            handleInputChange(
                              question.id,
                              currentValues.filter((value: string) => value !== option.id)
                            );
                          }
                        }}
                        className="form-checkbox"
                      />
                      <span className="ml-2">{option.text}</span>
                    </label>
                  ))}
                </div>
              );
              
            case 'range':
              return (
                <div>
                  <input
                    type="range"
                    id={question.id}
                    min={question.min || 0}
                    max={question.max || 10}
                    value={responses[question.id] || (question.min || 0)}
                    onChange={e => handleInputChange(question.id, e.target.value)}
                    className="w-full"
                    required={question.required}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{question.min || 0}</span>
                    <span>{((question.max || 10) - (question.min || 0)) / 2 + (question.min || 0)}</span>
                    <span>{question.max || 10}</span>
                  </div>
                </div>
              );
              
            default:
              return null;
          }
        })()}
        
        {/* Provider recommendation field - only show if it should be included in the health plan */}
        {responses[question.id] && question.includeRecommendation && (
          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Provider Recommendation
              </label>
              <span className="text-xs text-gray-500">Auto-populated from template</span>
            </div>
            <textarea
              value={recommendations[question.id] || ''}
              onChange={e => {
                setRecommendations(prev => ({
                  ...prev,
                  [question.id]: e.target.value
                }));
              }}
              className="form-textarea w-full border-green-200 bg-green-50"
              rows={3}
              placeholder="Recommendation will be shown in the patient's health plan"
            />
          </div>
        )}
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
  
  const currentSection = questionnaireSections[activeSection];
  const isLastSection = activeSection === questionnaireSections.length - 1;
  const isSectionComplete = completedSections.includes(activeSection);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{templateName} - {patientName}</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleSaveProgress}
            className="btn-secondary flex items-center"
            disabled={isSaving}
          >
            <FiSave className="mr-1" /> {isSaving ? 'Saving...' : 'Save Progress'}
          </button>
          <Link href={`/dashboard/visits/${visitId}`} className="btn-secondary">
            Exit
          </Link>
        </div>
      </div>
      
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${((completedSections.length) / questionnaireSections.length) * 100}%` }}
            ></div>
          </div>
          <span className="ml-4 text-sm text-gray-600">
            {completedSections.length} of {questionnaireSections.length} complete
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {questionnaireSections.map((section, index) => (
            <button
              key={section.id}
              className={`px-3 py-1.5 rounded-full text-sm ${
                activeSection === index
                  ? 'bg-blue-600 text-white'
                  : completedSections.includes(index)
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-800 border border-gray-300'
              }`}
              onClick={() => setActiveSection(index)}
            >
              {index + 1}. {section.title}
              {completedSections.includes(index) && (
                <FiCheckCircle className="ml-1 inline text-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="card">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{currentSection.title}</h2>
          <p className="text-gray-600">{currentSection.description}</p>
        </div>
        
        {formErrors.length > 0 && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md">
            <div className="flex items-center text-red-800 font-medium mb-2">
              <FiAlertCircle className="mr-2" /> Please correct the following errors:
            </div>
            <ul className="list-disc pl-6 text-red-700 text-sm">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="space-y-8">
          {currentSection.questions.map((question, index) => (
            <div key={question.id} className="pb-6 border-b last:border-b-0 last:pb-0">
              <label className="block mb-2 font-medium">
                {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderQuestion(question)}
            </div>
          ))}
        </div>
        
        {isLastSection && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">Recommendation Summary</h3>
            
            {Object.keys(recommendations).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(recommendations)
                  .filter(([_, value]) => value.trim() !== '')
                  .map(([questionId, recommendation]) => {
                    const questionText = findQuestionText(questionId);
                    const response = responses[questionId];
                    
                    return (
                      <div key={questionId} className="p-3 bg-gray-50 rounded-md">
                        <div className="font-medium">{questionText}</div>
                        <div className="text-sm text-gray-600 mb-2">
                          Patient response: {Array.isArray(response) ? response.join(', ') : response}
                        </div>
                        <div className="text-sm bg-blue-50 p-2 rounded border border-blue-100">
                          <span className="font-medium text-blue-800">Recommendation:</span> {recommendation}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-gray-500 italic">
                No recommendations have been added yet. Add recommendations to specific questions above.
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={handlePrevSection}
            className="btn-secondary flex items-center"
            disabled={activeSection === 0}
          >
            <FiChevronLeft className="mr-1" /> Previous
          </button>
          
          <div>
            {isLastSection ? (
              <button
                onClick={handleCompleteVisit}
                className="btn-success flex items-center"
                disabled={isSaving}
              >
                <FiCheckCircle className="mr-1" /> {isSaving ? 'Completing...' : 'Complete Visit & Generate Health Plan'}
              </button>
            ) : (
              <button
                onClick={handleNextSection}
                className="btn-primary flex items-center"
              >
                Next <FiChevronRight className="ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 