'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight, FiSave, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';
import { v4 as uuidv4 } from 'uuid';

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
  config?: {
    units?: 'metric' | 'imperial'; // For BMI
    heightField?: string; // For BMI reference
    weightField?: string; // For BMI reference
    thresholds?: { // For PHQ-2, MMSE, and CAGE
      min?: number;
      max?: number;
      warningThreshold?: number;
    };
    subtype?: string; // For specific subtypes of questions
  };
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

interface BMIQuestion extends QuestionBase {
  type: 'bmi';
  config: {
    units: 'metric' | 'imperial';
  };
}

interface VitalSignsQuestion extends QuestionBase {
  type: 'vitalSigns';
  config: {
    subtype: 'full' | 'basic';
  };
}

interface PHQ2Question extends QuestionBase {
  type: 'phq2';
  options: Option[];
  config: {
    thresholds: {
      warningThreshold: number;
    };
  };
}

interface CognitiveAssessmentQuestion extends QuestionBase {
  type: 'cognitiveAssessment';
  config: {
    subtype: 'mmse' | 'moca';
    thresholds: {
      warningThreshold: number;
    };
  };
}

interface CAGEQuestion extends QuestionBase {
  type: 'cageScreening';
  options: Option[];
  config: {
    thresholds: {
      warningThreshold: number;
    };
  };
}

type Question = TextQuestion | SelectQuestion | CheckboxQuestion | RangeQuestion | 
  BMIQuestion | VitalSignsQuestion | PHQ2Question | CognitiveAssessmentQuestion | CAGEQuestion;

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

// Function to calculate BMI
const calculateBMI = (height: number, weight: number, units: 'metric' | 'imperial'): { value: number, category: string } => {
  let bmi: number;
  
  if (units === 'metric') {
    // Height in cm, weight in kg
    const heightInMeters = height / 100;
    bmi = weight / (heightInMeters * heightInMeters);
  } else {
    // Height in inches, weight in lbs
    bmi = (weight * 703) / (height * height);
  }
  
  // Round to one decimal place
  bmi = Math.round(bmi * 10) / 10;
  
  // Determine BMI category
  let category: string;
  if (bmi < 18.5) {
    category = 'Underweight';
  } else if (bmi < 25) {
    category = 'Normal weight';
  } else if (bmi < 30) {
    category = 'Overweight';
  } else {
    category = 'Obesity';
  }
  
  return { value: bmi, category };
};

// Function to calculate PHQ-2 score
const calculatePHQ2Score = (answers: number[]): { score: number, risk: string } => {
  const score = answers.reduce((total, answer) => total + answer, 0);
  const risk = score >= 3 ? 'High' : 'Low';
  return { score, risk };
};

// Function to calculate CAGE score
const calculateCAGEScore = (answers: boolean[]): { score: number, risk: string } => {
  const score = answers.filter(answer => answer).length;
  const risk = score >= 2 ? 'High' : 'Low';
  return { score, risk };
};

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
          setResponses(visitData.responses);
        }
        
        // Fetch template if available
        if (visitData.templateId) {
          try {
            const templateData = await templateService.getTemplateById(visitData.templateId);
            if (templateData) {
              setTemplateName(templateData.name || 'Visit Assessment');
              
              // Process template sections and questions WITHOUT altering question types
              const processedSections = templateData.sections.map((section: any) => {
                // Process each question in the section
                const processedQuestions = section.questions.map((question: any) => {
                  // Create a deep copy of the question to avoid mutating the original
                  const processedQuestion = {
                    ...question,
                    id: question.id || question._id,
                    // Preserve the original type exactly as it is in the template
                    type: question.type,
                    // Process options if present
                    options: question.options 
                      ? question.options.map((option: any) => ({
                          id: option.value || option.id,
                          text: option.label || option.text,
                          recommendation: option.recommendation || '',
                          selected: option.selected || false,
                          score: option.score || 0
                        }))
                      : [],
                    // Preserve all configuration exactly as it is
                    config: question.config || {},
                    // Include additional metadata
                    required: question.required || false,
                    includeRecommendation: question.includeRecommendation || false,
                    defaultRecommendation: question.defaultRecommendation || '',
                    conditional: question.conditionalLogic
                      ? {
                          questionId: question.conditionalLogic.dependsOn,
                          value: question.conditionalLogic.showWhen?.value,
                          operator: question.conditionalLogic.showWhen?.operator
                        }
                      : undefined
                  };
                  
                  // Add any specific processing needed for particular question types
                  if (question.type === 'bmi') {
                    processedQuestion.config = {
                      ...processedQuestion.config,
                      units: processedQuestion.config?.units || 'metric'
                    };
                  } else if (question.type === 'phq2' || question.type === 'cognitiveAssessment' || question.type === 'cageScreening') {
                    processedQuestion.config = {
                      ...processedQuestion.config,
                      thresholds: {
                        ...processedQuestion.config?.thresholds,
                        warningThreshold: processedQuestion.config?.thresholds?.warningThreshold || 
                          (question.type === 'phq2' ? 3 : question.type === 'cognitiveAssessment' ? 24 : 2)
                      }
                    };
                  }
                  
                  return processedQuestion;
                });
                
                return {
                  ...section,
                  id: section.id || section._id,
                  title: section.title || 'Untitled Section',
                  description: section.description || '',
                  questions: processedQuestions
                };
              });
              
              setQuestionnaireSections(processedSections);
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
  
  const handleInputChange = (
    question: Question, 
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const input = e.target as HTMLInputElement;
    
    let newValue: any;
    
    if (isCheckbox) {
      const currentValues = Array.isArray(responses[name]) ? responses[name] : [];
      newValue = input.checked
        ? [...currentValues, value]
        : currentValues.filter((v: string) => v !== value);
    } else {
      newValue = value;
    }
    
    setResponses(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Auto-set recommendations based on selection
    if (question.includeRecommendation) {
      if (question.type === 'select' || question.type === 'radio') {
        const selectedOption = question.options.find(opt => opt.id === newValue);
        if (selectedOption?.recommendation) {
          setRecommendations(prev => ({
            ...prev,
            [name]: selectedOption.recommendation || ''
          }));
        }
      } else if (question.type === 'checkbox') {
        const selectedOptions = question.options.filter(opt => newValue.includes(opt.id));
        const recommendations = selectedOptions
          .map(opt => opt.recommendation)
          .filter(Boolean);
        if (recommendations.length > 0) {
          setRecommendations(prev => ({
            ...prev,
            [name]: recommendations.join('\n')
          }));
        }
      } else if (question.type === 'range') {
        const numValue = parseInt(newValue);
        if (question.defaultRecommendation) {
          const recommendation = question.defaultRecommendation.replace('{value}', numValue.toString());
          setRecommendations(prev => ({
            ...prev,
            [name]: recommendation
          }));
        }
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
      
      try {
        // Compile all recommendations into a health plan
        const healthPlanRecommendations = [];
        const processedRecommendations = new Set(); // To avoid duplicates
        
        // Gather recommendations from all sections and questions
        questionnaireSections.forEach(section => {
          section.questions.forEach(question => {
            // Handle recommendations from multiple choice questions
            if ((question.type === 'select' || question.type === 'radio' || question.type === 'checkbox') && 
                question.options && question.includeRecommendation) {
              
              // For checkbox questions (multiple selections)
              if (question.type === 'checkbox' && Array.isArray(responses[question.id])) {
                const selectedOptions = question.options.filter(opt => 
                  responses[question.id].includes(opt.id)
                );
                
                selectedOptions.forEach(option => {
                  if (option.recommendation && !processedRecommendations.has(option.recommendation)) {
                    healthPlanRecommendations.push({
                      domain: section.title,
                      text: option.recommendation,
                      priority: 'medium',
                      source: {
                        question: question.text,
                        response: option.text
                      }
                    });
                    processedRecommendations.add(option.recommendation);
                  }
                });
              } 
              // For radio/select questions (single selection)
              else if (responses[question.id]) {
                const selectedOption = question.options.find(opt => 
                  opt.id === responses[question.id]
                );
                
                if (selectedOption?.recommendation && !processedRecommendations.has(selectedOption.recommendation)) {
                  healthPlanRecommendations.push({
                    domain: section.title,
                    text: selectedOption.recommendation,
                    priority: 'medium',
                    source: {
                      question: question.text,
                      response: selectedOption.text
                    }
                  });
                  processedRecommendations.add(selectedOption.recommendation);
                }
              }
            }
            
            // Handle BMI recommendations
            if (question.type === 'bmi' && responses[question.id]) {
              const bmiValue = parseFloat(responses[question.id]);
              const bmiCategory = responses[`${question.id}_category`];
              const bmiRecommendation = getBMIRecommendation(bmiValue);
              
              if (bmiRecommendation && !processedRecommendations.has(bmiRecommendation)) {
                healthPlanRecommendations.push({
                  domain: 'Weight Management',
                  text: bmiRecommendation,
                  priority: bmiValue >= 30 || bmiValue < 18.5 ? 'high' : 'medium',
                  source: {
                    question: question.text,
                    response: `BMI: ${bmiValue} (${bmiCategory})`
                  }
                });
                processedRecommendations.add(bmiRecommendation);
              }
            }
            
            // Handle vital signs recommendations
            if (question.type === 'vitalSigns') {
              const systolic = responses[`${question.id}_systolic`];
              const diastolic = responses[`${question.id}_diastolic`];
              const heartRate = responses[`${question.id}_heartRate`];
              
              if (systolic && diastolic && heartRate) {
                const vitalSignsRecommendation = getVitalSignsRecommendation(
                  parseFloat(systolic), 
                  parseFloat(diastolic), 
                  parseFloat(heartRate)
                );
                
                if (vitalSignsRecommendation && !processedRecommendations.has(vitalSignsRecommendation)) {
                  const isPriority = parseFloat(systolic) >= 140 || parseFloat(diastolic) >= 90;
                  
                  healthPlanRecommendations.push({
                    domain: 'Cardiovascular Health',
                    text: vitalSignsRecommendation,
                    priority: isPriority ? 'high' : 'medium',
                    source: {
                      question: question.text,
                      response: `BP: ${systolic}/${diastolic}, HR: ${heartRate}`
                    }
                  });
                  processedRecommendations.add(vitalSignsRecommendation);
                }
              }
            }
            
            // Handle PHQ-2 recommendations
            if (question.type === 'phq2' && responses[question.id]) {
              const score = parseInt(responses[question.id]);
              const risk = responses[`${question.id}_risk`];
              
              if (risk === 'High') {
                const phq2Recommendation = 'Consider further assessment with PHQ-9 and referral to mental health services.';
                
                if (!processedRecommendations.has(phq2Recommendation)) {
                  healthPlanRecommendations.push({
                    domain: 'Mental Health',
                    text: phq2Recommendation,
                    priority: 'high',
                    source: {
                      question: question.text,
                      response: `Score: ${score}/6 (Risk: ${risk})`
                    }
                  });
                  processedRecommendations.add(phq2Recommendation);
                }
              }
            }
            
            // Handle Cognitive Assessment recommendations
            if (question.type === 'cognitiveAssessment' && responses[question.id]) {
              const score = parseInt(responses[question.id]);
              const risk = responses[`${question.id}_risk`];
              
              if (risk === 'High') {
                const cogRecommendation = 'Results indicate potential cognitive impairment. Consider referral for comprehensive neuropsychological testing.';
                
                if (!processedRecommendations.has(cogRecommendation)) {
                  healthPlanRecommendations.push({
                    domain: 'Cognitive Health',
                    text: cogRecommendation,
                    priority: 'high',
                    source: {
                      question: question.text,
                      response: `Score: ${score}/30 (Risk: ${risk})`
                    }
                  });
                  processedRecommendations.add(cogRecommendation);
                }
              }
            }
            
            // Handle CAGE recommendations
            if (question.type === 'cageScreening' && responses[question.id]) {
              const score = parseInt(responses[question.id]);
              const risk = responses[`${question.id}_risk`];
              
              if (risk === 'High') {
                const cageRecommendation = 'Results suggest potential alcohol problem. Consider referral for alcohol abuse assessment and counseling.';
                
                if (!processedRecommendations.has(cageRecommendation)) {
                  healthPlanRecommendations.push({
                    domain: 'Substance Use',
                    text: cageRecommendation,
                    priority: 'high',
                    source: {
                      question: question.text,
                      response: `Score: ${score}/4 (Risk: ${risk})`
                    }
                  });
                  processedRecommendations.add(cageRecommendation);
                }
              }
            }
            
            // Add any default recommendations (for range questions, etc.)
            if (question.defaultRecommendation && responses[question.id]) {
              const defaultRec = question.defaultRecommendation.replace(
                '{value}', 
                responses[question.id].toString()
              );
              
              if (!processedRecommendations.has(defaultRec)) {
                healthPlanRecommendations.push({
                  domain: section.title,
                  text: defaultRec,
                  priority: 'medium',
                  source: {
                    question: question.text,
                    response: responses[question.id].toString()
                  }
                });
                processedRecommendations.add(defaultRec);
              }
            }
          });
        });
        
        // Generate a health plan summary
        const healthPlanSummary = generateHealthPlanSummary(healthPlanRecommendations);
        
        // Update the visit
        await visitService.updateVisit(visitId, {
          status: 'completed',
          responses: responses,
          healthPlan: {
            recommendations: healthPlanRecommendations,
            summary: healthPlanSummary
          }
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
  
  // Helper function to generate a health plan summary
  const generateHealthPlanSummary = (recommendations: any[]) => {
    const highPriorityCount = recommendations.filter(rec => rec.priority === 'high').length;
    const domains = new Set(recommendations.map(rec => rec.domain));
    
    return `This health plan includes ${recommendations.length} recommendations across ${domains.size} health domains${highPriorityCount > 0 ? `, with ${highPriorityCount} high-priority items` : ''}.`;
  };
  
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
    switch (question.type) {
      case 'select':
        return (
          <select
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            className="form-select w-full"
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
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={responses[question.id] === option.id}
                  onChange={(e) => handleInputChange(question, e)}
                  className="form-radio"
                />
                <span className="text-sm text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name={question.id}
                  value={option.id}
                  checked={Array.isArray(responses[question.id]) 
                    ? responses[question.id].includes(option.id)
                    : false}
                  onChange={(e) => handleInputChange(question, e)}
                  className="form-checkbox"
                />
                <span className="text-sm text-gray-700">{option.text}</span>
              </label>
            ))}
          </div>
        );
      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              name={question.id}
              min={question.min || 0}
              max={question.max || 100}
              value={responses[question.id] || question.min || 0}
              onChange={(e) => handleInputChange(question, e)}
              className="form-range w-full"
            />
            <div className="text-sm text-gray-700 text-center">
              {responses[question.id] || question.min || 0}
            </div>
          </div>
        );
      case 'textarea':
        return (
          <textarea
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            className="form-textarea w-full"
            rows={4}
          />
        );
      case 'bmi': {
        const units = question.config?.units || 'metric';
        const heightLabel = units === 'metric' ? 'Height (cm)' : 'Height (in)';
        const weightLabel = units === 'metric' ? 'Weight (kg)' : 'Weight (lbs)';
        
        // Get stored values
        const heightValue = responses[`${question.id}_height`] || '';
        const weightValue = responses[`${question.id}_weight`] || '';
        
        // Calculate BMI if both height and weight are provided
        let bmiResult = null;
        if (heightValue && weightValue) {
          bmiResult = calculateBMI(
            parseFloat(heightValue), 
            parseFloat(weightValue), 
            units
          );
        }
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">{heightLabel}</label>
                <input
                  type="number"
                  name={`${question.id}_height`}
                  value={heightValue}
                  onChange={(e) => {
                    // Update height value
                    const newResponses = {
                      ...responses,
                      [`${question.id}_height`]: e.target.value
                    };
                    
                    // Recalculate BMI if weight exists
                    if (weightValue) {
                      const bmi = calculateBMI(
                        parseFloat(e.target.value), 
                        parseFloat(weightValue), 
                        units
                      );
                      newResponses[question.id] = bmi.value;
                      newResponses[`${question.id}_category`] = bmi.category;
                    }
                    
                    setResponses(newResponses);
                  }}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{weightLabel}</label>
                <input
                  type="number"
                  name={`${question.id}_weight`}
                  value={weightValue}
                  onChange={(e) => {
                    // Update weight value
                    const newResponses = {
                      ...responses,
                      [`${question.id}_weight`]: e.target.value
                    };
                    
                    // Recalculate BMI if height exists
                    if (heightValue) {
                      const bmi = calculateBMI(
                        parseFloat(heightValue), 
                        parseFloat(e.target.value), 
                        units
                      );
                      newResponses[question.id] = bmi.value;
                      newResponses[`${question.id}_category`] = bmi.category;
                    }
                    
                    setResponses(newResponses);
                  }}
                  className="form-input w-full"
                />
              </div>
            </div>
            
            {bmiResult && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                <div className="font-medium">BMI Result: {bmiResult.value}</div>
                <div className="text-sm text-gray-600">
                  Category: {bmiResult.category}
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'vitalSigns': {
        const subtype = question.config?.subtype || 'full';
        const isFull = subtype === 'full';
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  name={`${question.id}_systolic`}
                  value={responses[`${question.id}_systolic`] || ''}
                  onChange={(e) => {
                    setResponses({
                      ...responses,
                      [`${question.id}_systolic`]: e.target.value
                    });
                  }}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  name={`${question.id}_diastolic`}
                  value={responses[`${question.id}_diastolic`] || ''}
                  onChange={(e) => {
                    setResponses({
                      ...responses,
                      [`${question.id}_diastolic`]: e.target.value
                    });
                  }}
                  className="form-input w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                name={`${question.id}_heartRate`}
                value={responses[`${question.id}_heartRate`] || ''}
                onChange={(e) => {
                  setResponses({
                    ...responses,
                    [`${question.id}_heartRate`]: e.target.value
                  });
                }}
                className="form-input w-full"
              />
            </div>
            
            {isFull && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Respiratory Rate (breaths/min)</label>
                  <input
                    type="number"
                    name={`${question.id}_respiratoryRate`}
                    value={responses[`${question.id}_respiratoryRate`] || ''}
                    onChange={(e) => {
                      setResponses({
                        ...responses,
                        [`${question.id}_respiratoryRate`]: e.target.value
                      });
                    }}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    name={`${question.id}_temperature`}
                    value={responses[`${question.id}_temperature`] || ''}
                    onChange={(e) => {
                      setResponses({
                        ...responses,
                        [`${question.id}_temperature`]: e.target.value
                      });
                    }}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    name={`${question.id}_oxygenSaturation`}
                    value={responses[`${question.id}_oxygenSaturation`] || ''}
                    onChange={(e) => {
                      setResponses({
                        ...responses,
                        [`${question.id}_oxygenSaturation`]: e.target.value
                      });
                    }}
                    className="form-input w-full"
                  />
                </div>
              </>
            )}
          </div>
        );
      }
      case 'phq2':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded mb-4">
              <p className="text-sm">
                Over the last 2 weeks, how often have you been bothered by the following problems?
              </p>
            </div>
            
            {/* Question 1 */}
            <div className="p-3 border rounded">
              <p className="font-medium mb-2">Little interest or pleasure in doing things</p>
              <div className="space-y-2">
                {['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)'].map((option, index) => (
                  <label key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name={`${question.id}_q1`}
                      value={index}
                      checked={responses[`${question.id}_q1`] === index.toString()}
                      onChange={(e) => {
                        const newResponses = {
                          ...responses,
                          [`${question.id}_q1`]: e.target.value
                        };
                        
                        // Calculate score if both questions are answered
                        if (newResponses[`${question.id}_q1`] !== undefined && newResponses[`${question.id}_q2`] !== undefined) {
                          const score = calculatePHQ2Score([
                            parseInt(newResponses[`${question.id}_q1`]), 
                            parseInt(newResponses[`${question.id}_q2`])
                          ]);
                          newResponses[question.id] = score.score;
                          newResponses[`${question.id}_risk`] = score.risk;
                        }
                        
                        setResponses(newResponses);
                      }}
                      className="form-radio"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Question 2 */}
            <div className="p-3 border rounded">
              <p className="font-medium mb-2">Feeling down, depressed, or hopeless</p>
              <div className="space-y-2">
                {['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)'].map((option, index) => (
                  <label key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name={`${question.id}_q2`}
                      value={index}
                      checked={responses[`${question.id}_q2`] === index.toString()}
                      onChange={(e) => {
                        const newResponses = {
                          ...responses,
                          [`${question.id}_q2`]: e.target.value
                        };
                        
                        // Calculate score if both questions are answered
                        if (newResponses[`${question.id}_q1`] !== undefined && newResponses[`${question.id}_q2`] !== undefined) {
                          const score = calculatePHQ2Score([
                            parseInt(newResponses[`${question.id}_q1`]), 
                            parseInt(newResponses[`${question.id}_q2`])
                          ]);
                          newResponses[question.id] = score.score;
                          newResponses[`${question.id}_risk`] = score.risk;
                        }
                        
                        setResponses(newResponses);
                      }}
                      className="form-radio"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Show score if both questions are answered */}
            {responses[`${question.id}_q1`] !== undefined && responses[`${question.id}_q2`] !== undefined && (
              <div className={`p-3 border rounded ${responses[`${question.id}_risk`] === 'High' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <p className="font-medium">PHQ-2 Score: {responses[question.id]}/6</p>
                <p className="text-sm mt-1">
                  Risk: {responses[`${question.id}_risk`]}
                  {responses[`${question.id}_risk`] === 'High' && (
                    <span className="block mt-1 text-red-600">
                      Score ≥3 indicates further assessment may be needed
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      case 'cognitiveAssessment': {
        const testType = question.config?.subtype || 'mmse';
        const isMMSE = testType === 'mmse';
        const scoreMax = isMMSE ? 30 : 30; // Both MMSE and MoCA are scored out of 30
        
        // Simplified implementation - in a real app, would have a full assessment form
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded mb-4">
              <p className="font-medium">{isMMSE ? 'Mini-Mental State Examination (MMSE)' : 'Montreal Cognitive Assessment (MoCA)'}</p>
              <p className="text-sm mt-1">
                This is a brief cognitive screening tool that assesses various cognitive domains.
              </p>
            </div>
            
            <div>
              <label className="block font-medium mb-2">
                Total Score (0-{scoreMax})
                <span className="text-sm text-gray-600 ml-2">Enter the total score after completing the assessment</span>
              </label>
              <input
                type="number"
                name={question.id}
                value={responses[question.id] || ''}
                onChange={(e) => {
                  const score = parseInt(e.target.value);
                  const warningThreshold = question.config?.thresholds?.warningThreshold || 24;
                  const risk = score < warningThreshold ? 'High' : 'Low';
                  
                  setResponses({
                    ...responses,
                    [question.id]: score,
                    [`${question.id}_risk`]: risk
                  });
                }}
                min="0"
                max={scoreMax}
                className="form-input w-full"
              />
            </div>
            
            {responses[question.id] && (
              <div className={`p-3 border rounded ${responses[`${question.id}_risk`] === 'High' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <p className="font-medium">Cognitive Assessment Score: {responses[question.id]}/{scoreMax}</p>
                <p className="text-sm mt-1">
                  Risk: {responses[`${question.id}_risk`]}
                  {responses[`${question.id}_risk`] === 'High' && (
                    <span className="block mt-1 text-red-600">
                      Score below threshold ({question.config?.thresholds?.warningThreshold || 24}) indicates potential cognitive impairment
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      }
      case 'cageScreening':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded mb-4">
              <p className="font-medium">CAGE Alcohol Screening Questionnaire</p>
              <p className="text-sm mt-1">
                Please answer the following questions about your alcohol use:
              </p>
            </div>
            
            {/* CAGE Questions */}
            {[
              'Have you ever felt you needed to Cut down on your drinking?',
              'Have people Annoyed you by criticizing your drinking?',
              'Have you ever felt Guilty about drinking?',
              'Have you ever felt you needed a drink first thing in the morning (Eye-opener)?'
            ].map((cageQuestion, index) => (
              <div key={index} className="p-3 border rounded">
                <p className="font-medium mb-2">{cageQuestion}</p>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`${question.id}_q${index}`}
                      value="yes"
                      checked={responses[`${question.id}_q${index}`] === 'yes'}
                      onChange={(e) => {
                        const newResponses = {
                          ...responses,
                          [`${question.id}_q${index}`]: e.target.value
                        };
                        
                        // Calculate score if all questions are answered
                        const allAnswered = [0, 1, 2, 3].every(i => 
                          newResponses[`${question.id}_q${i}`] === 'yes' || newResponses[`${question.id}_q${i}`] === 'no'
                        );
                        
                        if (allAnswered) {
                          const answers = [0, 1, 2, 3].map(i => newResponses[`${question.id}_q${i}`] === 'yes');
                          const score = calculateCAGEScore(answers);
                          newResponses[question.id] = score.score;
                          newResponses[`${question.id}_risk`] = score.risk;
                        }
                        
                        setResponses(newResponses);
                      }}
                      className="form-radio"
                    />
                    <span className="ml-2">Yes</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`${question.id}_q${index}`}
                      value="no"
                      checked={responses[`${question.id}_q${index}`] === 'no'}
                      onChange={(e) => {
                        const newResponses = {
                          ...responses,
                          [`${question.id}_q${index}`]: e.target.value
                        };
                        
                        // Calculate score if all questions are answered
                        const allAnswered = [0, 1, 2, 3].every(i => 
                          newResponses[`${question.id}_q${i}`] === 'yes' || newResponses[`${question.id}_q${i}`] === 'no'
                        );
                        
                        if (allAnswered) {
                          const answers = [0, 1, 2, 3].map(i => newResponses[`${question.id}_q${i}`] === 'yes');
                          const score = calculateCAGEScore(answers);
                          newResponses[question.id] = score.score;
                          newResponses[`${question.id}_risk`] = score.risk;
                        }
                        
                        setResponses(newResponses);
                      }}
                      className="form-radio"
                    />
                    <span className="ml-2">No</span>
                  </label>
                </div>
              </div>
            ))}
            
            {/* Show score if all questions are answered */}
            {responses[question.id] !== undefined && (
              <div className={`p-3 border rounded ${responses[`${question.id}_risk`] === 'High' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <p className="font-medium">CAGE Score: {responses[question.id]}/4</p>
                <p className="text-sm mt-1">
                  Risk: {responses[`${question.id}_risk`]}
                  {responses[`${question.id}_risk`] === 'High' && (
                    <span className="block mt-1 text-red-600">
                      Score ≥2 indicates clinically significant alcohol problem
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <input
            type="text"
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            className="form-input w-full"
          />
        );
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