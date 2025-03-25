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
  id?: string;
  text?: string;
  value?: string;
  label?: string;
  recommendation?: string;
  score?: number;
}

interface ConditionalType {
  questionId: string;
  value: string | number | boolean;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan';
}

interface QuestionBase {
  id: string;
  text: string;
  type: 'text' | 'multipleChoice' | 'numeric' | 'date' | 'boolean' | 'bmi' | 'vitalSigns' | 'phq2' | 'cognitiveAssessment' | 'cageScreening';
  required: boolean;
  options?: Option[];
  includeRecommendation?: boolean;
  defaultRecommendation?: string;
  conditional?: {
    questionId: string;
    value?: string | number | boolean;
    notValue?: string | number | boolean;
  };
}

interface TextQuestion extends QuestionBase {
  type: 'text';
  config?: {
    multiline?: boolean;
  };
}

interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multipleChoice';
  options: Option[];
  config?: {
    multiple?: boolean;
  };
}

interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  config?: {
    min?: number;
    max?: number;
    step?: number;
    units?: string;
  };
}

interface DateQuestion extends QuestionBase {
  type: 'date';
  config?: {
    min?: string;
    max?: string;
  };
}

interface BooleanQuestion extends QuestionBase {
  type: 'boolean';
  options: Option[];
  config?: {
    trueLabel?: string;
    falseLabel?: string;
  };
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
      min: number;
      max: number;
      warningThreshold: number;
    };
  };
}

interface CognitiveAssessmentQuestion extends QuestionBase {
  type: 'cognitiveAssessment';
  config: {
    subtype: 'mmse' | 'moca';
    thresholds: {
      min: number;
      max: number;
      warningThreshold: number;
    };
  };
}

interface CAGEQuestion extends QuestionBase {
  type: 'cageScreening';
  options: Option[];
  config: {
    thresholds: {
      min: number;
      max: number;
      warningThreshold: number;
    };
  };
}

type Question = TextQuestion | MultipleChoiceQuestion | NumericQuestion | DateQuestion | BooleanQuestion | BMIQuestion | VitalSignsQuestion | PHQ2Question | CognitiveAssessmentQuestion | CAGEQuestion;

interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  questions: (ProcessedQuestion | {
    id: string;
    text: string;
    type: TemplateQuestionType | AppQuestionType;
    required: boolean;
    options?: {
      id?: string;
      text?: string;
      value?: string;
      label?: string;
      recommendation?: string;
      score?: number;
    }[];
    includeRecommendation?: boolean;
    defaultRecommendation?: string;
    min?: number;
    max?: number;
    config?: {
      min?: number;
      max?: number;
      step?: number;
      units?: string;
      multiline?: boolean;
      multiple?: boolean;
      trueLabel?: string;
      falseLabel?: string;
      subtype?: string;
      thresholds?: {
        min: number;
        max: number;
        warningThreshold: number;
      };
    };
    conditional?: {
      questionId: string;
      value?: string | number | boolean;
      notValue?: string | number | boolean;
      operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan';
    };
  })[];
}

// Add a specific type for healthPlanRecommendation
interface HealthPlanRecommendation {
  domain: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  source?: {
    question: string;
    response?: string;
  };
}

// Add a type for the visitService.updateVisit arguments
interface IVisitUpdateRequest {
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  responses?: Record<string, any>;
  notes?: string;
  healthPlan?: {
    recommendations: HealthPlanRecommendation[];
    summary: string;
  };
  completedSections?: number[];
}

// Template question types
type TemplateTextType = 'text' | 'textarea';
type TemplateChoiceType = 'select' | 'radio' | 'checkbox';
type TemplateNumericType = 'numeric' | 'range';
type TemplateDateType = 'date';
type TemplateBooleanType = 'boolean';
type TemplateSpecializedType = 'bmi' | 'vitalSigns' | 'phq2' | 'cognitiveAssessment' | 'cageScreening';

// Combined type that represents ALL possible template question types
type TemplateQuestionType = 
  | TemplateTextType 
  | TemplateChoiceType 
  | TemplateNumericType 
  | TemplateDateType 
  | TemplateBooleanType
  | TemplateSpecializedType;

// Application question types
type AppQuestionType = 
  | 'text' 
  | 'multipleChoice' 
  | 'numeric' 
  | 'date' 
  | 'boolean' 
  | 'bmi' 
  | 'vitalSigns' 
  | 'phq2' 
  | 'cognitiveAssessment' 
  | 'cageScreening';

interface BaseQuestion {
  id: string;
  _id?: string;
  text: string;
  required: boolean;
  options?: {
    value?: string;
    label?: string;
    id?: string;
    text?: string;
    recommendation?: string;
    score?: number;
    selected?: boolean;
  }[];
  config?: {
    min?: number;
    max?: number;
    step?: number;
    units?: string;
    multiline?: boolean;
    multiple?: boolean;
    trueLabel?: string;
    falseLabel?: string;
    subtype?: string;
    thresholds?: {
      min: number;
      max: number;
      warningThreshold: number;
    };
  };
  includeRecommendation?: boolean;
  defaultRecommendation?: string;
}

interface TemplateQuestion extends BaseQuestion {
  type: TemplateQuestionType;
  conditionalLogic?: {
    dependsOn: string;
    showWhen: {
      value: string | number | boolean;
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan';
    };
  };
}

interface ProcessedQuestion extends BaseQuestion {
  type: AppQuestionType;
  originalType?: TemplateQuestionType; // Original template type
  renderType?: string; // Specific type to use for rendering UI elements
  conditional?: {
    questionId: string;
    value?: string | number | boolean;
    notValue?: string | number | boolean;
    operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan';
  };
}

// Helper function to check if a template type maps to a specific processed type
const isTemplateType = (templateType: TemplateQuestionType, processedType: AppQuestionType): boolean => {
  switch (processedType) {
    case 'text':
      return templateType === 'text' || templateType === 'textarea';
    case 'multipleChoice':
      return templateType === 'select' || templateType === 'radio' || templateType === 'checkbox';
    case 'numeric':
      return templateType === 'numeric' || templateType === 'range';
    case 'date':
      return templateType === 'date';
    case 'boolean':
      return templateType === 'boolean';
    case 'bmi':
      return templateType === 'bmi';
    case 'vitalSigns':
      return templateType === 'vitalSigns';
    case 'phq2':
      return templateType === 'phq2';
    case 'cognitiveAssessment':
      return templateType === 'cognitiveAssessment';
    case 'cageScreening':
      return templateType === 'cageScreening';
    default:
      return false;
  }
};

// Helper function to map template question types to our question types
const mapQuestionType = (templateType: TemplateQuestionType): AppQuestionType => {
  console.log('Mapping template type:', templateType);
  
  if (templateType === 'text' || templateType === 'textarea') {
    return 'text';
  }
  if (templateType === 'select' || templateType === 'radio' || templateType === 'checkbox') {
    return 'multipleChoice';
  }
  if (templateType === 'numeric' || templateType === 'range') {
    return 'numeric';
  }
  if (templateType === 'date') {
    return 'date';
  }
  if (templateType === 'boolean') {
    return 'boolean';
  }
  if (templateType === 'bmi') {
    return 'bmi';
  }
  if (templateType === 'vitalSigns') {
    return 'vitalSigns';
  }
  if (templateType === 'phq2') {
    return 'phq2';
  }
  if (templateType === 'cognitiveAssessment') {
    return 'cognitiveAssessment';
  }
  if (templateType === 'cageScreening') {
    return 'cageScreening';
  }
  
  console.log('Defaulting to text for unknown type:', templateType);
  return 'text';
};

// Helper function to safely get option value
function getOptionValue(option: any): string {
  // Handle case where options with recommendations might have been transformed
  if (option && typeof option === 'object') {
    return option.value || option.id || '';
  }
  // Handle case where option might be a string or primitive
  return String(option || '');
}

// Helper function to safely get option label
function getOptionLabel(option: any): string {
  // Handle case where options with recommendations might have been transformed
  if (option && typeof option === 'object') {
    return option.label || option.text || '';
  }
  // Handle case where option might be a string or primitive
  return String(option || '');
}

// Type guard to check if a question is a ProcessedQuestion
function isProcessedQuestion(question: any): question is ProcessedQuestion {
  return typeof question === 'object' && 
         question !== null && 
         ['text', 'multipleChoice', 'numeric', 'date', 'boolean', 'bmi', 'vitalSigns', 'phq2', 'cognitiveAssessment', 'cageScreening'].includes(question.type);
}

// Type guard to check if a question is a template question
function isTemplateQuestion(question: any): question is TemplateQuestion {
  return typeof question === 'object' && 
         question !== null && 
         ['text', 'textarea', 'select', 'radio', 'checkbox', 'numeric', 'range', 'date', 'boolean', 'bmi', 'vitalSigns', 'phq2', 'cognitiveAssessment', 'cageScreening'].includes(question.type);
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
const calculateBMI = (height: number, weight: number, units?: string): { value: number, category: string } => {
  const unitsNormalized = units as 'metric' | 'imperial' || 'metric';
  let bmi: number;
  
  if (unitsNormalized === 'metric') {
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
const calculatePHQ2Score = (interestScore: number, depressionScore: number): { score: number, risk: string } => {
  const score = interestScore + depressionScore;
  const risk = score >= 3 ? 'High' : 'Low';
  return { score, risk };
};

// Function to calculate CAGE score
const calculateCAGEScore = (answers: boolean[]): { score: number, risk: string } => {
  const score = answers.filter(answer => answer).length;
  const risk = score >= 2 ? 'High' : 'Low';
  return { score, risk };
};

// Function to calculate cognitive assessment score
const calculateCognitiveScore = (
  date: string,
  day: string, 
  place: string,
  address: string,
  president: string
): number => {
  // Simple implementation - 1 point for each non-empty answer
  let score = 0;
  if (date) score += 5;
  if (day) score += 5;
  if (place) score += 5;
  if (address) score += 5;
  if (president) score += 5;
  return score;
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
              
              // Process template sections and questions
              const processedSections = templateData.sections.map((section: any) => {
                // Process each question in the section
                const processedQuestions = section.questions.map((question: TemplateQuestion) => {
                  // Create a deep copy of the question to avoid mutating the original
                  const processedType = mapQuestionType(question.type);
                  
                  // Print question type for debugging
                  console.log('Processing question:', question.text, 'type:', question.type, 'mapped to:', processedType);
                  
                  const processedQuestion: ProcessedQuestion = {
                    id: question.id || question._id || '',
                    text: question.text,
                    required: question.required || false,
                    type: processedType,
                    originalType: question.type, // Store the original template type
                    renderType: question.type, // Store explicit render type - use the original template type for UI
                    includeRecommendation: question.includeRecommendation || false,
                    defaultRecommendation: question.defaultRecommendation || '',
                    
                    // Process options if present
                    options: question.options 
                      ? question.options.map((option) => ({
                          value: option.value,
                          label: option.label,
                          recommendation: option.recommendation || '',
                          selected: option.selected || false,
                          score: option.score || 0
                        }))
                      : [],
                      
                    // Map conditional logic
                    conditional: question.conditionalLogic
                      ? {
                          questionId: question.conditionalLogic.dependsOn,
                          value: question.conditionalLogic.showWhen.value,
                          operator: question.conditionalLogic.showWhen.operator
                        }
                      : undefined,
                    
                    // Initialize config with empty object
                    config: {}
                  };
                  
                  // Add type-specific configuration based on the mapped type
                  const templateType = question.type;
                  
                  switch (processedType) {
                    case 'text':
                      processedQuestion.config = {
                        multiline: templateType === 'textarea'
                      };
                      break;
                    
                    case 'multipleChoice':
                      processedQuestion.config = {
                        multiple: templateType === 'checkbox'
                      };
                      break;
                    
                    case 'numeric':
                      processedQuestion.config = {
                        min: question.config?.min,
                        max: question.config?.max,
                        step: question.config?.step || 1,
                        units: question.config?.units
                      };
                      break;
                    
                    case 'date':
                      processedQuestion.config = {
                        min: question.config?.min,
                        max: question.config?.max
                      };
                      break;
                    
                    case 'boolean':
                      processedQuestion.config = {
                        trueLabel: question.config?.trueLabel || 'Yes',
                        falseLabel: question.config?.falseLabel || 'No'
                      };
                      break;
                    
                    case 'bmi':
                      processedQuestion.config = {
                        units: (question.config?.units as 'metric' | 'imperial') || 'metric'
                      };
                      break;
                    
                    case 'vitalSigns':
                      processedQuestion.config = {
                        subtype: question.config?.subtype || 'basic'
                      };
                      break;
                    
                    case 'phq2':
                    case 'cognitiveAssessment':
                    case 'cageScreening':
                      processedQuestion.config = {
                        thresholds: {
                          min: question.config?.thresholds?.min || 0,
                          max: question.config?.thresholds?.max || 
                            (processedType === 'phq2' ? 6 : processedType === 'cognitiveAssessment' ? 30 : 4),
                          warningThreshold: question.config?.thresholds?.warningThreshold || 
                            (processedType === 'phq2' ? 3 : processedType === 'cognitiveAssessment' ? 24 : 2)
                        }
                      };
                      break;
                  }
                  
                  return processedQuestion;
                });
                
                return {
                  id: section.id || section._id || '',
                  title: section.title || 'Untitled Section',
                  description: section.description || '',
                  questions: processedQuestions
                } as QuestionnaireSection;
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
    question: ProcessedQuestion | any, 
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

    console.log(`Input change for ${name}: ${JSON.stringify(newValue)}`);

    // First ensure options have all necessary properties
    if (question.options) {
      question.options = question.options.map((opt: any) => ({
        ...opt,
        id: opt.id || opt.value || '',
        value: opt.value || opt.id || '',
        label: opt.label || opt.text || '',
        text: opt.text || opt.label || ''
      }));
    }

    // Auto-set recommendations based on selection
    if (question.includeRecommendation) {
      const questionType = isProcessedQuestion(question) 
        ? question.type 
        : isTemplateQuestion(question)
          ? question.type
          : mapQuestionType(question.type as TemplateQuestionType);
      
      console.log(`Processing recommendation for ${name} of type ${questionType}`);
      
      if (questionType === 'multipleChoice' || 
          question.options && question.options.length > 0) {
        if (question.config?.multiple && Array.isArray(newValue)) {
          // For checkbox (multiple selection) questions
          const selectedOptions = question.options?.filter((opt: any) => {
            return newValue.includes(getOptionValue(opt));
          }) || [];
          
          const recommendations = selectedOptions
            .map((opt: any) => opt.recommendation)
            .filter(Boolean);
            
          if (recommendations.length > 0) {
            setRecommendations(prev => ({
              ...prev,
              [question.id]: recommendations.join('\n')
            }));
            console.log(`Set recommendation for ${question.id}: ${recommendations.join('\n')}`);
          }
        } else {
          // For radio/select (single selection) questions
          const selectedOption = question.options?.find((opt: any) => {
            return getOptionValue(opt) === newValue;
          });
          
          if (selectedOption?.recommendation) {
            setRecommendations(prev => ({
              ...prev,
              [question.id]: selectedOption.recommendation
            }));
            console.log(`Set recommendation for ${question.id}: ${selectedOption.recommendation}`);
          }
        }
      } else if (questionType === 'numeric' || questionType === 'range') {
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue) && question.defaultRecommendation) {
          const recommendation = question.defaultRecommendation.replace('{value}', numValue.toString());
          setRecommendations(prev => ({
            ...prev,
            [question.id]: recommendation
          }));
          console.log(`Set recommendation for ${question.id}: ${recommendation}`);
        }
      } else if (questionType === 'text' || questionType === 'textarea') {
        // For text questions with defaultRecommendation
        if (question.defaultRecommendation) {
          const recommendation = question.defaultRecommendation;
          setRecommendations(prev => ({
            ...prev,
            [question.id]: recommendation
          }));
          console.log(`Set recommendation for ${question.id}: ${recommendation}`);
        }
      }
    }
    
    // Special handling for complex question types
    if (question.type === 'bmi' && 
        (name.endsWith('_height') || name.endsWith('_weight'))) {
      
      const questionId = name.split('_')[0];
      const heightField = `${questionId}_height`;
      const weightField = `${questionId}_weight`;
      
      if (responses[heightField] && responses[weightField]) {
        const height = parseFloat(responses[heightField]);
        const weight = parseFloat(responses[weightField]);
        const units = question.config?.units as 'metric' | 'imperial' || 'metric';
        
        if (!isNaN(height) && !isNaN(weight)) {
          const bmi = calculateBMI(height, weight, units);
          
          // Store BMI result
          setResponses(prev => ({
            ...prev,
            [questionId]: bmi.value,
            [`${questionId}_category`]: bmi.category
          }));
          
          // Store recommendation for BMI
          const bmiRecommendation = getBMIRecommendation(bmi.value);
          if (bmiRecommendation) {
            setRecommendations(prev => ({
              ...prev,
              [questionId]: bmiRecommendation
            }));
            console.log(`Set BMI recommendation for ${questionId}: ${bmiRecommendation}`);
          }
        }
      }
    }
    
    // Handle vital signs and add recommendation if values indicate issues
    if (question.type === 'vitalSigns' && 
        (name.endsWith('_systolic') || name.endsWith('_diastolic') || name.endsWith('_heartRate'))) {
      
      const questionId = name.split('_')[0];
      const systolicField = `${questionId}_systolic`;
      const diastolicField = `${questionId}_diastolic`;
      const heartRateField = `${questionId}_heartRate`;
      
      // Update with new value from the current field
      const updatedResponses = {
        ...responses,
        [name]: newValue
      };
      
      if (updatedResponses[systolicField] && updatedResponses[diastolicField] && updatedResponses[heartRateField]) {
        const systolic = parseFloat(updatedResponses[systolicField]);
        const diastolic = parseFloat(updatedResponses[diastolicField]);
        const heartRate = parseFloat(updatedResponses[heartRateField]);
        
        if (!isNaN(systolic) && !isNaN(diastolic) && !isNaN(heartRate)) {
          const recommendation = getVitalSignsRecommendation(systolic, diastolic, heartRate);
          if (recommendation) {
            setRecommendations(prev => ({
              ...prev,
              [questionId]: recommendation
            }));
            console.log(`Set vital signs recommendation for ${questionId}: ${recommendation}`);
          }
        }
      }
    }
    
    // Handle PHQ-2 scores when both questions are answered
    if (question.type === 'phq2' && 
        (name.endsWith('_interest') || name.endsWith('_depression'))) {
        
      const questionId = name.split('_')[0];
      const interestField = `${questionId}_interest`;
      const depressionField = `${questionId}_depression`;
      
      // Update with new value from the current field
      const updatedResponses = {
        ...responses,
        [name]: newValue
      };
      
      if (updatedResponses[interestField] && updatedResponses[depressionField]) {
        const interestScore = parseInt(updatedResponses[interestField]);
        const depressionScore = parseInt(updatedResponses[depressionField]);
        
        if (!isNaN(interestScore) && !isNaN(depressionScore)) {
          const result = calculatePHQ2Score(interestScore, depressionScore);
          
          // Store PHQ-2 result
          setResponses(prev => ({
            ...prev,
            [questionId]: result.score,
            [`${questionId}_risk`]: result.risk
          }));
          
          // Add recommendation for high risk score
          if (result.risk === 'High') {
            const phq2Recommendation = 'Consider further assessment with PHQ-9 and referral to mental health services.';
            setRecommendations(prev => ({
              ...prev,
              [questionId]: phq2Recommendation
            }));
            console.log(`Set PHQ2 recommendation for ${questionId}: ${phq2Recommendation}`);
          }
        }
      }
    }
    
    // Handle CAGE scores when all questions are answered
    if (question.type === 'cageScreening' && 
        (name.endsWith('_cutdown') || name.endsWith('_annoyed') || 
         name.endsWith('_guilty') || name.endsWith('_morning'))) {
         
      const questionId = name.split('_')[0];
      const cutdownField = `${questionId}_cutdown`;
      const annoyedField = `${questionId}_annoyed`;
      const guiltyField = `${questionId}_guilty`;
      const morningField = `${questionId}_morning`;
      
      // Update with new value from the current field
      const updatedResponses = {
        ...responses,
        [name]: newValue
      };
      
      if (updatedResponses[cutdownField] && updatedResponses[annoyedField] && 
          updatedResponses[guiltyField] && updatedResponses[morningField]) {
        
        const cageAnswers = [
          updatedResponses[cutdownField] === 'yes',
          updatedResponses[annoyedField] === 'yes',
          updatedResponses[guiltyField] === 'yes',
          updatedResponses[morningField] === 'yes'
        ];
        
        const result = calculateCAGEScore(cageAnswers);
        
        // Store CAGE result
        setResponses(prev => ({
          ...prev,
          [questionId]: result.score,
          [`${questionId}_risk`]: result.risk
        }));
        
        // Add recommendation for high risk score
        if (result.risk === 'High') {
          const cageRecommendation = 'Results suggest potential alcohol problem. Consider referral for alcohol abuse assessment and counseling.';
          setRecommendations(prev => ({
            ...prev,
            [questionId]: cageRecommendation
          }));
          console.log(`Set CAGE recommendation for ${questionId}: ${cageRecommendation}`);
        }
      }
    }
    
    // Handle cognitive assessment scores when all questions are answered
    if (question.type === 'cognitiveAssessment' && 
        (name.endsWith('_date') || name.endsWith('_day') || 
         name.endsWith('_place') || name.endsWith('_address') || 
         name.endsWith('_president'))) {
         
      const questionId = name.split('_')[0];
      const dateField = `${questionId}_date`;
      const dayField = `${questionId}_day`;
      const placeField = `${questionId}_place`;
      const addressField = `${questionId}_address`;
      const presidentField = `${questionId}_president`;
      
      // Update with new value from the current field
      const updatedResponses = {
        ...responses,
        [name]: newValue
      };
      
      if (updatedResponses[dateField] && updatedResponses[dayField] && 
          updatedResponses[placeField] && updatedResponses[addressField] && 
          updatedResponses[presidentField]) {
        
        const score = calculateCognitiveScore(
          updatedResponses[dateField],
          updatedResponses[dayField],
          updatedResponses[placeField],
          updatedResponses[addressField],
          updatedResponses[presidentField]
        );
        
        const risk = score < 20 ? 'High' : 'Low';
        
        // Store cognitive assessment result
        setResponses(prev => ({
          ...prev,
          [questionId]: score,
          [`${questionId}_risk`]: risk
        }));
        
        // Add recommendation for high risk score
        if (risk === 'High') {
          const cogRecommendation = 'Results indicate potential cognitive impairment. Consider referral for comprehensive neuropsychological testing.';
          setRecommendations(prev => ({
            ...prev,
            [questionId]: cogRecommendation
          }));
          console.log(`Set cognitive recommendation for ${questionId}: ${cogRecommendation}`);
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
        
        // Handle different conditional formats
        let conditionMet = false;
        
        if ('operator' in question.conditional) {
          const operator = question.conditional.operator;
          const responseValue = responses[conditionQuestion];
          
          switch (operator) {
            case 'equals':
              conditionMet = responseValue === conditionValue;
              break;
            case 'notEquals':
              conditionMet = responseValue !== conditionValue;
              break;
            case 'greaterThan':
              if (conditionValue !== undefined) {
                conditionMet = parseFloat(responseValue) > parseFloat(conditionValue.toString());
              }
              break;
            case 'lessThan':
              if (conditionValue !== undefined) {
                conditionMet = parseFloat(responseValue) < parseFloat(conditionValue.toString());
              }
              break;
            default:
              conditionMet = false;
          }
        } else if (question.conditional.notValue) {
          // Handle legacy format
          conditionMet = responses[conditionQuestion] !== question.conditional.notValue;
        } else if (conditionValue) {
          // Handle legacy format
          conditionMet = responses[conditionQuestion] === conditionValue;
        }
        
        if (!conditionMet) {
          return; // Skip this question
        }
      }
      
      // Special handling for different question types
      switch (question.type) {
        case 'text':
        case 'multipleChoice':
        case 'numeric':
        case 'date':
        case 'boolean':
        case 'bmi':
        case 'vitalSigns':
        case 'phq2':
        case 'cognitiveAssessment': 
        case 'cageScreening':
      // Validate required questions
      if (question.required && 
          (responses[question.id] === undefined || 
           responses[question.id] === '' || 
               (Array.isArray(responses[question.id]) && responses[question.id].length === 0))) {
        errors.push(`Question "${question.text}" is required.`);
          }
          
          // Additional validations for complex question types
          if (question.type === 'bmi' && question.required) {
            if (!responses[`${question.id}_height`] || !responses[`${question.id}_weight`]) {
              errors.push(`Please provide both height and weight for "${question.text}".`);
            }
          } else if (question.type === 'vitalSigns' && question.required) {
            if (!responses[`${question.id}_systolic`] || 
                !responses[`${question.id}_diastolic`] || 
                !responses[`${question.id}_heartRate`]) {
              errors.push(`Please provide blood pressure and heart rate for "${question.text}".`);
            }
          } else if (question.type === 'phq2' && question.required) {
            if (!responses[`${question.id}_interest`] || 
                !responses[`${question.id}_depression`]) {
              errors.push(`Please answer both questions for "${question.text}".`);
            }
          } else if (question.type === 'cognitiveAssessment' && question.required) {
            if (!responses[`${question.id}_date`] || 
                !responses[`${question.id}_day`] || 
                !responses[`${question.id}_place`] || 
                !responses[`${question.id}_address`] || 
                !responses[`${question.id}_president`]) {
              errors.push(`Please complete all fields for "${question.text}".`);
            }
          } else if (question.type === 'cageScreening' && question.required) {
            if (!responses[`${question.id}_cutdown`] || 
                !responses[`${question.id}_annoyed`] || 
                !responses[`${question.id}_guilty`] || 
                !responses[`${question.id}_morning`]) {
              errors.push(`Please answer all questions for "${question.text}".`);
            }
          }
          break;
        
        default:
          // Default validation for any other question types
          if (question.required) {
            errors.push(`Question "${question.text}" is required.`);
          }
          break;
      }
    });
    
    setFormErrors(errors);
    return errors.length === 0;
  };
  
  const handleSaveProgress = async () => {
    setIsSaving(true);
    
    try {
      // Validate current section
      const isValid = validateSection(activeSection);
      
      if (isValid) {
        // Update completed sections if current section is valid
        const updatedCompletedSections = [...completedSections];
        if (!updatedCompletedSections.includes(activeSection)) {
          updatedCompletedSections.push(activeSection);
          setCompletedSections(updatedCompletedSections);
        }
        
        console.log('Saving progress with sections:', updatedCompletedSections);
        
        // Save progress to the backend
        await visitService.updateVisit(visitId, {
          status: 'in-progress',
          responses: responses,
          completedSections: updatedCompletedSections
        } as IVisitUpdateRequest);
        
        // Show success message
        alert('Progress saved successfully');
      } else {
        alert('Please correct the errors before saving');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      alert('Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
        const healthPlanRecommendations: HealthPlanRecommendation[] = [];
        const processedRecommendations = new Set<string>(); // To avoid duplicates
        
        // First, add recommendations that were collected during input changes
        console.log('Recommendations from answers:', recommendations);
        Object.entries(recommendations).forEach(([questionId, recommendationText]) => {
          if (recommendationText && !processedRecommendations.has(recommendationText)) {
            // Find which section this question belongs to
            let sectionTitle = 'General';
            let questionText = 'Unknown';
            let responseText = 'Unknown';
            
            for (const section of questionnaireSections) {
              for (const question of section.questions) {
                if (question.id === questionId) {
                  sectionTitle = section.title;
                  questionText = question.text;
                  responseText = Array.isArray(responses[questionId]) 
                    ? responses[questionId].join(', ') 
                    : String(responses[questionId] || '');
                  break;
                }
              }
            }
            
            healthPlanRecommendations.push({
              domain: sectionTitle,
              text: recommendationText,
              priority: 'medium',
              source: {
                question: questionText,
                response: responseText
              }
            });
            
            processedRecommendations.add(recommendationText);
          }
        });
        
        // Gather recommendations from all sections and questions
        questionnaireSections.forEach(section => {
          section.questions.forEach(question => {
            // Handle recommendations from multiple choice questions
            if (question.type === 'multipleChoice' && question.options && question.includeRecommendation) {
              
              // For checkbox questions (multiple selections)
              if (question.config?.multiple && Array.isArray(responses[question.id])) {
                const selectedOptions = question.options.filter(opt => 
                  responses[question.id].includes(getOptionValue(opt))
                );
                
                selectedOptions.forEach(option => {
                  if (option.recommendation && !processedRecommendations.has(option.recommendation)) {
                    healthPlanRecommendations.push({
                      domain: section.title,
                      text: option.recommendation,
                      priority: 'medium',
                      source: {
                        question: question.text,
                        response: option.label || option.text || ''
                      }
                    });
                    processedRecommendations.add(option.recommendation);
                  }
                });
              } 
              // For radio/select questions (single selection)
              else if (responses[question.id]) {
                const selectedOption = question.options.find(opt => 
                  getOptionValue(opt) === responses[question.id]
                );
                
                if (selectedOption?.recommendation && !processedRecommendations.has(selectedOption.recommendation)) {
                  healthPlanRecommendations.push({
                    domain: section.title,
                    text: selectedOption.recommendation,
                    priority: 'medium',
                    source: {
                      question: question.text,
                      response: getOptionLabel(selectedOption)
                    }
                  });
                  processedRecommendations.add(selectedOption.recommendation);
                }
              }
            }
            
            // Handle BMI recommendations
            if ((question.type === 'bmi' || question.text?.toLowerCase().includes('bmi')) && 
                responses[`${question.id}_height`] && responses[`${question.id}_weight`]) {
              const height = parseFloat(responses[`${question.id}_height`]);
              const weight = parseFloat(responses[`${question.id}_weight`]);
              const bmiResult = calculateBMI(height, weight, question.config?.units);
              const bmiValue = bmiResult.value;
              const bmiCategory = bmiResult.category;
              const bmiRecommendation = getBMIRecommendation(bmiValue);
              
              if (bmiRecommendation && !processedRecommendations.has(bmiRecommendation)) {
                healthPlanRecommendations.push({
                  domain: 'Weight Management',
                  text: bmiRecommendation,
                  priority: bmiValue >= 30 || bmiValue < 18.5 ? 'high' : 'medium',
                  source: {
                    question: question.text,
                    response: `BMI: ${bmiValue.toFixed(1)} (${bmiCategory})`
                  }
                });
                processedRecommendations.add(bmiRecommendation);
              }
            }
            
            // Handle vital signs recommendations
            if ((question.type === 'vitalSigns' || question.text?.toLowerCase().includes('vital')) && 
                responses[`${question.id}_systolic`] && 
                responses[`${question.id}_diastolic`] && 
                responses[`${question.id}_heartRate`]) {
              
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
            if ((question.type === 'phq2' || question.text?.toLowerCase().includes('phq')) && 
                responses[`${question.id}_interest`] !== undefined && 
                responses[`${question.id}_depression`] !== undefined) {
              
              const interestScore = parseInt(responses[`${question.id}_interest`]);
              const depressionScore = parseInt(responses[`${question.id}_depression`]);
              const phq2Result = calculatePHQ2Score(interestScore, depressionScore);
              const score = phq2Result.score;
              const risk = phq2Result.risk;
              
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
            if ((question.type === 'cognitiveAssessment' || question.text?.toLowerCase().includes('cognitive')) && 
                responses[`${question.id}_date`] &&
                responses[`${question.id}_day`] &&
                responses[`${question.id}_place`] &&
                responses[`${question.id}_address`] &&
                responses[`${question.id}_president`]) {
                
              const score = calculateCognitiveScore(
                responses[`${question.id}_date`],
                responses[`${question.id}_day`],
                responses[`${question.id}_place`],
                responses[`${question.id}_address`],
                responses[`${question.id}_president`]
              );
              const risk = score < 20 ? 'High' : 'Low';
              
              if (risk === 'High') {
                const cogRecommendation = 'Results indicate potential cognitive impairment. Consider referral for comprehensive neuropsychological testing.';
                
                if (!processedRecommendations.has(cogRecommendation)) {
                  healthPlanRecommendations.push({
                    domain: 'Cognitive Health',
                    text: cogRecommendation,
                    priority: 'high',
                    source: {
                      question: question.text,
                      response: `Score: ${score}/25`
                    }
                  });
                  processedRecommendations.add(cogRecommendation);
                }
              }
            }
            
            // Handle CAGE recommendations
            if ((question.type === 'cageScreening' || question.text?.toLowerCase().includes('cage')) && 
                responses[`${question.id}_cutdown`] &&
                responses[`${question.id}_annoyed`] &&
                responses[`${question.id}_guilty`] &&
                responses[`${question.id}_morning`]) {
                
              const cageAnswers = [
                responses[`${question.id}_cutdown`] === 'yes',
                responses[`${question.id}_annoyed`] === 'yes',
                responses[`${question.id}_guilty`] === 'yes',
                responses[`${question.id}_morning`] === 'yes'
              ];
              
              const result = calculateCAGEScore(cageAnswers);
              const score = result.score;
              const risk = result.risk;
              
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
            
            // Add any default recommendations (for numeric questions, etc.)
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

        console.log('Generated health plan recommendations:', healthPlanRecommendations);
        
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
        } as IVisitUpdateRequest);
        
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
  const generateHealthPlanSummary = (recommendations: HealthPlanRecommendation[]): string => {
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
  
  // Handle multiple choice rendering and recommendation collection
  const processOptionsForRendering = (question: ProcessedQuestion | any) => {
    // Make sure we don't lose options that have recommendations
    if (question.options) {
      return question.options.map((option: any) => {
        // Ensure we preserve the original option structure
        return {
          ...option,
          id: option.id || option.value,
          value: option.value || option.id || '',
          label: option.label || option.text || '',
          text: option.text || option.label || ''
        };
      });
    }
    return [];
  };

  // Render form inputs based on question type
  const renderQuestion = (question: ProcessedQuestion | any) => {
    // Force the proper input type based on the question structure, not relying on types
    console.log('RENDERING QUESTION:', question);
    
    // Clone options to ensure we don't lose any necessary properties
    if (question.options) {
      question.options = question.options.map((opt: any) => ({
        ...opt,
        id: opt.id || opt.value || '',
        value: opt.value || opt.id || '',
        label: opt.label || opt.text || '',
        text: opt.text || opt.label || ''
      }));
    }
    
    // Handle BMI calculation - special check by question text or type
    if (question.text?.toLowerCase().includes('bmi') || question.type === 'bmi') {
      return renderBMICalculator(question);
    }
    
    // Handle cognitive assessment - special check by text or type
    if (question.text?.toLowerCase().includes('cognitive') || question.type === 'cognitiveAssessment') {
      return renderCognitiveAssessment(question);
    }
    
    // Handle vital signs - special check by text or type
    if (question.text?.toLowerCase().includes('vital') || question.type === 'vitalSigns') {
      return renderVitalSigns(question);
    }
    
    // Handle PHQ-2 - special check by text or type
    if (question.text?.toLowerCase().includes('phq') || question.type === 'phq2') {
      return renderPHQ2(question);
    }
    
    // Handle CAGE - special check by text or type
    if (question.text?.toLowerCase().includes('cage') || question.type === 'cageScreening') {
      return renderCAGEScreening(question);
    }
    
    // Always use originalType or renderType if available as our first choice
    let inputType = question.renderType || question.originalType || question.type;
    
    // Special handling for multipleChoice questions
    if (inputType === 'multipleChoice' || 
        (question.options && question.options.length > 0)) {
      // Check if multiple selections are allowed (checkbox)
      if (question.config?.multiple === true) {
        inputType = 'checkbox';
      } 
      // Check if it's a dropdown (select)
      else if (question.options.length > 4 || inputType === 'select') {
        inputType = 'select';
      }
      // Default to radio buttons for fewer options
      else {
        inputType = 'radio';
      }
    }
    
    // Handle textarea
    if (question.config?.multiline === true) {
      inputType = 'textarea';
    }
    
    console.log('Final inputType:', inputType, 'for question:', question.text);
    
    // Force-map to correct input types based on hard-coded conditions to ensure proper rendering
    switch (inputType) {
      case 'text':
        return (
          <input
            type="text"
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter your answer"
          />
        );
      case 'textarea':
        return (
          <textarea
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
            rows={4}
            placeholder="Enter your answer"
          />
        );
      case 'select':
        return (
          <select
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select an option</option>
            {question.options?.map((option: any) => (
              <option key={getOptionValue(option)} value={getOptionValue(option)}>
                {getOptionLabel(option)}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((option: any) => (
              <label key={getOptionValue(option)} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={question.id}
                  value={getOptionValue(option)}
                  checked={responses[question.id] === getOptionValue(option)}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  className="form-radio"
                />
                <span>{getOptionLabel(option)}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((option: any) => (
              <label key={getOptionValue(option)} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name={question.id}
                  value={getOptionValue(option)}
                  checked={(responses[question.id] || []).includes(getOptionValue(option))}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  className="form-checkbox"
                />
                <span>{getOptionLabel(option)}</span>
              </label>
            ))}
          </div>
        );
      case 'numeric':
        case 'range':
          return (
            <input
              type="number"
              name={question.id}
              value={responses[question.id] || ''}
              onChange={(e) => handleInputChange(question, e)}
              required={question.required}
              min={question.config?.min}
              max={question.config?.max}
              step={question.config?.step || 1}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter a number"
            />
          );
      case 'date':
        return (
          <input
            type="date"
            name={question.id}
            value={responses[question.id] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            min={question.config?.min}
            max={question.config?.max}
            className="w-full px-3 py-2 border rounded-md"
          />
        );
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={responses[question.id] === 'true'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>{question.config?.trueLabel || 'Yes'}</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={responses[question.id] === 'false'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>{question.config?.falseLabel || 'No'}</span>
            </label>
          </div>
        );
      case 'bmi':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Height ({question.config?.units === 'metric' ? 'cm' : 'inches'})
              </label>
              <input
                type="number"
                name={`${question.id}_height`}
                value={responses[`${question.id}_height`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                min={question.config?.units === 'metric' ? 50 : 20}
                max={question.config?.units === 'metric' ? 300 : 120}
                step={question.config?.units === 'metric' ? 0.1 : 0.1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Weight ({question.config?.units === 'metric' ? 'kg' : 'lbs'})
              </label>
              <input
                type="number"
                name={`${question.id}_weight`}
                value={responses[`${question.id}_weight`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                min={question.config?.units === 'metric' ? 20 : 44}
                max={question.config?.units === 'metric' ? 300 : 660}
                step={question.config?.units === 'metric' ? 0.1 : 0.1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            {responses[`${question.id}_height`] && responses[`${question.id}_weight`] && (
              <div className="mt-2">
                {(() => {
                  const height = parseFloat(responses[`${question.id}_height`]);
                  const weight = parseFloat(responses[`${question.id}_weight`]);
                  const units = question.config?.units as 'metric' | 'imperial' || 'metric';
                  const bmi = calculateBMI(height, weight, units);
                  
                  // Store BMI in responses for health plan generation
                  if (!responses[question.id]) {
                    setResponses(prev => ({
                      ...prev,
                      [question.id]: bmi.value,
                      [`${question.id}_category`]: bmi.category
                    }));
                  }
                  
                  return (
                    <p className="text-sm font-medium text-gray-700">
                      BMI: {bmi.value.toFixed(1)} ({bmi.category})
                    </p>
                  );
        })()}
              </div>
            )}
          </div>
        );
      case 'vitalSigns':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Blood Pressure (mmHg)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name={`${question.id}_systolic`}
                  value={responses[`${question.id}_systolic`] || ''}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  min={70}
                  max={200}
                  step={0.1}
                  className="w-1/2 px-3 py-2 border rounded-md"
                  placeholder="Systolic"
                />
                <input
                  type="number"
                  name={`${question.id}_diastolic`}
                  value={responses[`${question.id}_diastolic`] || ''}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  min={40}
                  max={130}
                  step={0.1}
                  className="w-1/2 px-3 py-2 border rounded-md"
                  placeholder="Diastolic"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                name={`${question.id}_heartRate`}
                value={responses[`${question.id}_heartRate`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                min={40}
                max={200}
                step={0.1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature (°F)
              </label>
              <input
                type="number"
                name={`${question.id}_temperature`}
                value={responses[`${question.id}_temperature`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                min={95}
                max={105}
                step={0.1}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        );
      case 'phq2':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Little interest or pleasure in doing things
              </label>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((score) => (
                  <label key={score} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`${question.id}_interest`}
                      value={score}
                      checked={responses[`${question.id}_interest`] === score.toString()}
                      onChange={(e) => handleInputChange(question, e)}
                      required={question.required}
                      className="form-radio"
                    />
                    <span>
                      {score === 0 ? 'Not at all' :
                       score === 1 ? 'Several days' :
                       score === 2 ? 'More than half the days' :
                       'Nearly every day'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Feeling down, depressed, or hopeless
              </label>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((score) => (
                  <label key={score} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name={`${question.id}_depression`}
                      value={score}
                      checked={responses[`${question.id}_depression`] === score.toString()}
                      onChange={(e) => handleInputChange(question, e)}
                      required={question.required}
                      className="form-radio"
                    />
                    <span>
                      {score === 0 ? 'Not at all' :
                       score === 1 ? 'Several days' :
                       score === 2 ? 'More than half the days' :
                       'Nearly every day'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {responses[`${question.id}_interest`] && responses[`${question.id}_depression`] && (
              <div className="mt-2">
                {(() => {
                  const interestScore = parseInt(responses[`${question.id}_interest`] as string);
                  const depressionScore = parseInt(responses[`${question.id}_depression`] as string);
                  const result = calculatePHQ2Score(interestScore, depressionScore);
                  
                  // Store PHQ2 score in responses for health plan generation
                  if (!responses[question.id]) {
                    setResponses(prev => ({
                      ...prev,
                      [question.id]: result.score,
                      [`${question.id}_risk`]: result.risk
                    }));
                  }
                  
                  return (
                    <p className="text-sm font-medium text-gray-700">
                      PHQ-2 Score: {result.score} - {result.risk} Risk
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        );
      case 'cognitiveAssessment':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                What is today's date?
              </label>
              <input
                type="date"
                name={`${question.id}_date`}
                value={responses[`${question.id}_date`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                What day of the week is it?
              </label>
              <select
                name={`${question.id}_day`}
                value={responses[`${question.id}_day`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                What is the name of this place?
              </label>
              <input
                type="text"
                name={`${question.id}_place`}
                value={responses[`${question.id}_place`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                What is your address?
              </label>
              <input
                type="text"
                name={`${question.id}_address`}
                value={responses[`${question.id}_address`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Who is the current president?
              </label>
              <input
                type="text"
                name={`${question.id}_president`}
                value={responses[`${question.id}_president`] || ''}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            {responses[`${question.id}_date`] && responses[`${question.id}_day`] && 
             responses[`${question.id}_place`] && responses[`${question.id}_address`] && 
             responses[`${question.id}_president`] && (
              <div className="mt-2">
                {(() => {
                  const score = calculateCognitiveScore(
                    responses[`${question.id}_date`] as string,
                    responses[`${question.id}_day`] as string,
                    responses[`${question.id}_place`] as string,
                    responses[`${question.id}_address`] as string,
                    responses[`${question.id}_president`] as string
                  );
                  
                  const risk = score < 20 ? 'High' : 'Low';
                  
                  // Store cognitive score in responses for health plan generation
                  if (!responses[question.id]) {
                    setResponses(prev => ({
                  ...prev,
                      [question.id]: score,
                      [`${question.id}_risk`]: risk
                    }));
                  }
                  
                  return (
                    <p className="text-sm font-medium text-gray-700">
                      Cognitive Assessment Score: {score}/25 - {risk} Risk
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        );
      case 'cageScreening':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Have you ever felt you should cut down on your drinking?
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_cutdown`}
                    value="yes"
                    checked={responses[`${question.id}_cutdown`] === 'yes'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_cutdown`}
                    value="no"
                    checked={responses[`${question.id}_cutdown`] === 'no'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Have people annoyed you by criticizing your drinking?
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_annoyed`}
                    value="yes"
                    checked={responses[`${question.id}_annoyed`] === 'yes'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_annoyed`}
                    value="no"
                    checked={responses[`${question.id}_annoyed`] === 'no'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Have you ever felt bad or guilty about your drinking?
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_guilty`}
                    value="yes"
                    checked={responses[`${question.id}_guilty`] === 'yes'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_guilty`}
                    value="no"
                    checked={responses[`${question.id}_guilty`] === 'no'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Have you ever had a drink first thing in the morning to steady your nerves or get rid of a hangover?
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_morning`}
                    value="yes"
                    checked={responses[`${question.id}_morning`] === 'yes'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`${question.id}_morning`}
                    value="no"
                    checked={responses[`${question.id}_morning`] === 'no'}
                    onChange={(e) => handleInputChange(question, e)}
                    required={question.required}
                    className="form-radio"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
            {responses[`${question.id}_cutdown`] && responses[`${question.id}_annoyed`] && 
             responses[`${question.id}_guilty`] && responses[`${question.id}_morning`] && (
              <div className="mt-2">
                {(() => {
                  const cageAnswers = [
                    responses[`${question.id}_cutdown`] === 'yes',
                    responses[`${question.id}_annoyed`] === 'yes',
                    responses[`${question.id}_guilty`] === 'yes',
                    responses[`${question.id}_morning`] === 'yes'
                  ];
                  
                  const result = calculateCAGEScore(cageAnswers);
                  
                  // Store CAGE score in responses for health plan generation
                  if (!responses[question.id]) {
                    setResponses(prev => ({
                      ...prev,
                      [question.id]: result.score,
                      [`${question.id}_risk`]: result.risk
                    }));
                  }
                  
                  return (
                    <p className="text-sm font-medium text-gray-700">
                      CAGE Score: {result.score} - {result.risk} Risk
                    </p>
                  );
                })()}
          </div>
        )}
      </div>
    );
      default:
        return null; // Return null for unknown question types
    }
  };
  
  // Specialized renderers for complex question types
  const renderBMICalculator = (question: ProcessedQuestion | any) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Height ({question.config?.units === 'metric' ? 'cm' : 'inches'})
          </label>
          <input
            type="number"
            name={`${question.id}_height`}
            value={responses[`${question.id}_height`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            min={question.config?.units === 'metric' ? 50 : 20}
            max={question.config?.units === 'metric' ? 300 : 120}
            step={question.config?.units === 'metric' ? 0.1 : 0.1}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Weight ({question.config?.units === 'metric' ? 'kg' : 'lbs'})
          </label>
          <input
            type="number"
            name={`${question.id}_weight`}
            value={responses[`${question.id}_weight`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            min={question.config?.units === 'metric' ? 20 : 44}
            max={question.config?.units === 'metric' ? 300 : 660}
            step={question.config?.units === 'metric' ? 0.1 : 0.1}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        {responses[`${question.id}_height`] && responses[`${question.id}_weight`] && (
          <div className="mt-2">
            {(() => {
              const height = parseFloat(responses[`${question.id}_height`]);
              const weight = parseFloat(responses[`${question.id}_weight`]);
              const units = question.config?.units as 'metric' | 'imperial' || 'metric';
              const bmi = calculateBMI(height, weight, units);
              
              // Store BMI in responses for health plan generation
              if (!responses[question.id]) {
                setResponses(prev => ({
                  ...prev,
                  [question.id]: bmi.value,
                  [`${question.id}_category`]: bmi.category
                }));
              }
              
              return (
                <p className="text-sm font-medium text-gray-700">
                  BMI: {bmi.value.toFixed(1)} ({bmi.category})
                </p>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderVitalSigns = (question: ProcessedQuestion | any) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Blood Pressure (mmHg)
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              name={`${question.id}_systolic`}
              value={responses[`${question.id}_systolic`] || ''}
              onChange={(e) => handleInputChange(question, e)}
              required={question.required}
              min={70}
              max={200}
              step={0.1}
              className="w-1/2 px-3 py-2 border rounded-md"
              placeholder="Systolic"
            />
            <input
              type="number"
              name={`${question.id}_diastolic`}
              value={responses[`${question.id}_diastolic`] || ''}
              onChange={(e) => handleInputChange(question, e)}
              required={question.required}
              min={40}
              max={130}
              step={0.1}
              className="w-1/2 px-3 py-2 border rounded-md"
              placeholder="Diastolic"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            name={`${question.id}_heartRate`}
            value={responses[`${question.id}_heartRate`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            min={40}
            max={200}
            step={0.1}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Temperature (°F)
          </label>
          <input
            type="number"
            name={`${question.id}_temperature`}
            value={responses[`${question.id}_temperature`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            min={95}
            max={105}
            step={0.1}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>
    );
  };

  const renderPHQ2 = (question: ProcessedQuestion | any) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Little interest or pleasure in doing things
          </label>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((score) => (
              <label key={score} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`${question.id}_interest`}
                  value={score}
                  checked={responses[`${question.id}_interest`] === score.toString()}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  className="form-radio"
                />
                <span>
                  {score === 0 ? 'Not at all' :
                   score === 1 ? 'Several days' :
                   score === 2 ? 'More than half the days' :
                   'Nearly every day'}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Feeling down, depressed, or hopeless
          </label>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((score) => (
              <label key={score} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`${question.id}_depression`}
                  value={score}
                  checked={responses[`${question.id}_depression`] === score.toString()}
                  onChange={(e) => handleInputChange(question, e)}
                  required={question.required}
                  className="form-radio"
                />
                <span>
                  {score === 0 ? 'Not at all' :
                   score === 1 ? 'Several days' :
                   score === 2 ? 'More than half the days' :
                   'Nearly every day'}
                </span>
              </label>
            ))}
          </div>
        </div>
        {responses[`${question.id}_interest`] && responses[`${question.id}_depression`] && (
          <div className="mt-2">
            {(() => {
              const interestScore = parseInt(responses[`${question.id}_interest`] as string);
              const depressionScore = parseInt(responses[`${question.id}_depression`] as string);
              const result = calculatePHQ2Score(interestScore, depressionScore);
              
              // Store PHQ2 score in responses for health plan generation
              if (!responses[question.id]) {
                setResponses(prev => ({
                  ...prev,
                  [question.id]: result.score,
                  [`${question.id}_risk`]: result.risk
                }));
              }
              
              return (
                <p className="text-sm font-medium text-gray-700">
                  PHQ-2 Score: {result.score} - {result.risk} Risk
                </p>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderCognitiveAssessment = (question: ProcessedQuestion | any) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What is today's date?
          </label>
          <input
            type="date"
            name={`${question.id}_date`}
            value={responses[`${question.id}_date`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What day of the week is it?
          </label>
          <select
            name={`${question.id}_day`}
            value={responses[`${question.id}_day`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select a day</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What is the name of this place?
          </label>
          <input
            type="text"
            name={`${question.id}_place`}
            value={responses[`${question.id}_place`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            What is your address?
          </label>
          <input
            type="text"
            name={`${question.id}_address`}
            value={responses[`${question.id}_address`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Who is the current president?
          </label>
          <input
            type="text"
            name={`${question.id}_president`}
            value={responses[`${question.id}_president`] || ''}
            onChange={(e) => handleInputChange(question, e)}
            required={question.required}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        {responses[`${question.id}_date`] && responses[`${question.id}_day`] && 
         responses[`${question.id}_place`] && responses[`${question.id}_address`] && 
         responses[`${question.id}_president`] && (
          <div className="mt-2">
            {(() => {
              const score = calculateCognitiveScore(
                responses[`${question.id}_date`] as string,
                responses[`${question.id}_day`] as string,
                responses[`${question.id}_place`] as string,
                responses[`${question.id}_address`] as string,
                responses[`${question.id}_president`] as string
              );
              
              const risk = score < 20 ? 'High' : 'Low';
              
              // Store cognitive score in responses for health plan generation
              if (!responses[question.id]) {
                setResponses(prev => ({
                  ...prev,
                  [question.id]: score,
                  [`${question.id}_risk`]: risk
                }));
              }
              
              return (
                <p className="text-sm font-medium text-gray-700">
                  Cognitive Assessment Score: {score}/25 - {risk} Risk
                </p>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderCAGEScreening = (question: ProcessedQuestion | any) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Have you ever felt you should cut down on your drinking?
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_cutdown`}
                value="yes"
                checked={responses[`${question.id}_cutdown`] === 'yes'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_cutdown`}
                value="no"
                checked={responses[`${question.id}_cutdown`] === 'no'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>No</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Have people annoyed you by criticizing your drinking?
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_annoyed`}
                value="yes"
                checked={responses[`${question.id}_annoyed`] === 'yes'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_annoyed`}
                value="no"
                checked={responses[`${question.id}_annoyed`] === 'no'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>No</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Have you ever felt bad or guilty about your drinking?
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_guilty`}
                value="yes"
                checked={responses[`${question.id}_guilty`] === 'yes'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_guilty`}
                value="no"
                checked={responses[`${question.id}_guilty`] === 'no'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>No</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Have you ever had a drink first thing in the morning to steady your nerves or get rid of a hangover?
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_morning`}
                value="yes"
                checked={responses[`${question.id}_morning`] === 'yes'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name={`${question.id}_morning`}
                value="no"
                checked={responses[`${question.id}_morning`] === 'no'}
                onChange={(e) => handleInputChange(question, e)}
                required={question.required}
                className="form-radio"
              />
              <span>No</span>
            </label>
          </div>
        </div>
        {responses[`${question.id}_cutdown`] && responses[`${question.id}_annoyed`] && 
         responses[`${question.id}_guilty`] && responses[`${question.id}_morning`] && (
          <div className="mt-2">
            {(() => {
              const cageAnswers = [
                responses[`${question.id}_cutdown`] === 'yes',
                responses[`${question.id}_annoyed`] === 'yes',
                responses[`${question.id}_guilty`] === 'yes',
                responses[`${question.id}_morning`] === 'yes'
              ];
              
              const result = calculateCAGEScore(cageAnswers);
              
              // Store CAGE score in responses for health plan generation
              if (!responses[question.id]) {
                setResponses(prev => ({
                  ...prev,
                  [question.id]: result.score,
                  [`${question.id}_risk`]: result.risk
                }));
              }
              
              return (
                <p className="text-sm font-medium text-gray-700">
                  CAGE Score: {result.score} - {result.risk} Risk
                </p>
              );
            })()}
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
      
      {/* Debug section to show question types */}
      <div className="card mb-6 bg-yellow-50 border-yellow-400">
        <h3 className="text-lg font-semibold mb-3">Debug Question Types</h3>
        <div className="overflow-auto max-h-48">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Question</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">OriginalType</th>
                <th className="text-left p-2">RenderType</th>
              </tr>
            </thead>
            <tbody>
              {questionnaireSections.flatMap(section => 
                section.questions.map((q: any) => (
                  <tr key={q.id} className="border-b">
                    <td className="p-2">{q.text}</td>
                    <td className="p-2">{q.type}</td>
                    <td className="p-2">{q.originalType || 'N/A'}</td>
                    <td className="p-2">{q.renderType || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              {renderQuestion(question as ProcessedQuestion)}
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
                    // Find the question and its containing section
                    let questionText = 'Unknown Question';
                    let sectionTitle = 'Unknown Section';
                    let responseText = 'Unknown Response';
                    
                    for (const section of questionnaireSections) {
                      for (const question of section.questions) {
                        if (question.id === questionId) {
                          questionText = question.text;
                          sectionTitle = section.title;
                          
                          // Format response based on question type
                          const response = responses[questionId];
                          if (Array.isArray(response)) {
                            // For multiple selection questions
                            responseText = response.join(', ');
                          } else if (question.type === 'bmi' || questionText.toLowerCase().includes('bmi')) {
                            // For BMI questions
                            const bmiValue = responses[questionId];
                            const bmiCategory = responses[`${questionId}_category`];
                            responseText = `BMI: ${parseFloat(bmiValue).toFixed(1)} (${bmiCategory})`;
                          } else if (question.type === 'vitalSigns' || questionText.toLowerCase().includes('vital')) {
                            // For vital signs questions
                            const systolic = responses[`${questionId}_systolic`];
                            const diastolic = responses[`${questionId}_diastolic`];
                            const heartRate = responses[`${questionId}_heartRate`];
                            responseText = `BP: ${systolic}/${diastolic}, HR: ${heartRate}`;
                          } else if (question.type === 'phq2' || questionText.toLowerCase().includes('phq')) {
                            // For PHQ-2 questions
                            const score = responses[questionId];
                            const risk = responses[`${questionId}_risk`];
                            responseText = `Score: ${score}/6 (Risk: ${risk})`;
                          } else if (question.type === 'cognitiveAssessment' || questionText.toLowerCase().includes('cognitive')) {
                            // For cognitive assessment questions
                            const score = responses[questionId];
                            responseText = `Score: ${score}/25`;
                          } else if (question.type === 'cageScreening' || questionText.toLowerCase().includes('cage')) {
                            // For CAGE questions
                            const score = responses[questionId];
                            const risk = responses[`${questionId}_risk`];
                            responseText = `Score: ${score}/4 (Risk: ${risk})`;
                          } else if (question.options && question.options.length > 0) {
                            // For single selection questions
                            const selectedOption = question.options.find(opt => 
                              getOptionValue(opt) === response
                            );
                            responseText = selectedOption ? getOptionLabel(selectedOption) : String(response || '');
                          } else {
                            // Default for other question types
                            responseText = String(response || '');
                          }
                          
                          break;
                        }
                      }
                    }
                    
                    return (
                      <div key={questionId} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-start">
                          <div className="font-medium">{questionText}</div>
                          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {sectionTitle}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Response:</strong> {responseText}
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