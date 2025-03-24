'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiSave, FiArrowLeft } from 'react-icons/fi';
import templateService from '@/services/templateService';
import { ITemplateResponse, ISection } from '@/models/Template';
import { uuidv4 } from '@/utils/uuid';

// Define local types for the editor
interface Option {
  id: string;
  text: string;
  recommendation?: string;
}

interface Condition {
  questionId: string;
  operator: 'equals' | 'notEquals';
  value: string;
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'range';
  required: boolean;
  options?: Option[];
  minValue?: number;
  maxValue?: number;
  condition?: Condition;
  includeRecommendation: boolean;
  defaultRecommendation?: string;
}

interface Section {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface EditorTemplate {
  id: string;
  name: string;
  description: string;
  sections: Section[];
}

// Empty template for new template creation
const createEmptyTemplate = (): EditorTemplate => ({
  id: 'new',
  name: '',
  description: '',
  sections: [
    {
      id: uuidv4(),
      title: 'New Section',
      description: '',
      questions: [],
    },
  ],
});

// Convert API template to editor format
const convertApiToEditorTemplate = (apiTemplate: ITemplateResponse | null): EditorTemplate => {
  if (!apiTemplate) {
    return createEmptyTemplate();
  }

  // Map sections
  const sections = apiTemplate.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description || '',
    questions: section.questions.map(q => ({
      id: q.id,
      text: q.text,
      type: convertQuestionType(q.type),
      required: q.required,
      options: q.options?.map(opt => ({
        id: opt.value,
        text: opt.label,
        recommendation: '', // Not directly available in API model
      })) || [],
      minValue: 0, // Default values
      maxValue: 10,
      condition: q.conditionalLogic ? {
        questionId: q.conditionalLogic.dependsOn,
        operator: q.conditionalLogic.showWhen.operator === 'equals' ? 'equals' : 'notEquals' as const,
        value: q.conditionalLogic.showWhen.value.toString(),
      } : undefined,
      includeRecommendation: false, // Not directly available in API model
    })),
  }));

  // Use proper type assertion for _id
  const id = apiTemplate._id?.toString() || apiTemplate.id || 'new';

  return {
    id,
    name: apiTemplate.name,
    description: apiTemplate.description || '',
    sections: sections as unknown as Section[],
  };
};

// Convert editor template to API format
const convertEditorToApiTemplate = (editorTemplate: EditorTemplate): Partial<ITemplateResponse> => {
  // Map sections
  const sections = editorTemplate.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    questions: section.questions.map(q => {
      // Handle different question types
      let type: 'text' | 'multipleChoice' | 'numeric' | 'date' | 'boolean';
      
      // Map UI question types to API question types
      switch(q.type) {
        case 'text': 
        case 'textarea': 
          type = 'text'; 
          break;
        case 'select':
        case 'radio':
        case 'checkbox':
          type = 'multipleChoice';
          break;
        case 'range':
          type = 'numeric';
          break;
        default:
          type = 'text';
      }
      
      return {
        id: q.id,
        text: q.text,
        type,
        required: q.required,
        options: q.options?.map(opt => ({
          value: opt.id,
          label: opt.text,
        })),
        conditionalLogic: q.condition ? {
          dependsOn: q.condition.questionId,
          showWhen: {
            value: q.condition.value,
            operator: q.condition.operator === 'equals' ? 
              ('equals' as const) : 
              ('notEquals' as const),
          }
        } : undefined,
      };
    }),
  }));

  return {
    name: editorTemplate.name,
    description: editorTemplate.description,
    sections: sections as unknown as ISection[],
    isActive: true,
    version: 1
  };
};

// Helper to convert API question type to editor type
const convertQuestionType = (apiType: string): Question['type'] => {
  switch (apiType) {
    case 'text': return 'text';
    case 'multipleChoice': return 'radio';
    case 'numeric': return 'range';
    case 'date': return 'text';
    case 'boolean': return 'radio';
    default: return 'text';
  }
};

// Helper to convert editor question type to API type
const convertEditorQuestionType = (editorType: Question['type']): string => {
  switch (editorType) {
    case 'text':
    case 'textarea':
      return 'text';
    case 'select':
    case 'radio':
      return 'multipleChoice';
    case 'checkbox':
      return 'multipleChoice';
    case 'range':
      return 'numeric';
    default:
      return 'text';
  }
};

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = typeof params?.id === 'string' ? params.id : 'new';
  const isNew = templateId === 'new';
  
  const [template, setTemplate] = useState<EditorTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (isNew) {
          // Create a new empty template
          setTemplate(createEmptyTemplate());
        } else {
          // Fetch template from API
          const apiTemplate = await templateService.getTemplateById(templateId);
          
          // Convert to editor format
          const editorTemplate = convertApiToEditorTemplate(apiTemplate);
          setTemplate(editorTemplate);
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError('Failed to load template. Please try again.');
        setTemplate(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTemplate();
  }, [templateId, isNew]);
  
  const handleTemplateSave = async () => {
    if (!template) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Convert to API format
      const apiTemplate = convertEditorToApiTemplate(template);
      
      if (isNew) {
        // Create new template with required fields
        await templateService.createTemplate({
          name: apiTemplate.name || 'Untitled Template',
          description: apiTemplate.description,
          sections: apiTemplate.sections as ISection[],
          isActive: apiTemplate.isActive || false,
          version: apiTemplate.version || 1,
          createdBy: 'system' // Would be user ID in a real application
        });
      } else {
        // Update existing template
        await templateService.updateTemplate(templateId, apiTemplate);
      }
      
      router.push('/dashboard/templates');
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTemplateChange = (field: string, value: string) => {
    if (!template) return;
    
    setTemplate({
      ...template,
      [field]: value,
    });
  };
  
  const handleSectionChange = (sectionIndex: number, field: string, value: string) => {
    if (!template) return;
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      [field]: value,
    };
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const addSection = () => {
    if (!template) return;
    
    const newSection: Section = {
      id: uuidv4(),
      title: 'New Section',
      description: '',
      questions: [],
    };
    
    setTemplate({
      ...template,
      sections: [...template.sections, newSection],
    });
    
    // Switch to the new section
    setActiveSection(template.sections.length);
  };
  
  const removeSection = (sectionIndex: number) => {
    if (!template) return;
    if (template.sections.length <= 1) return; // Don't remove the last section
    
    const updatedSections = template.sections.filter((_, index) => index !== sectionIndex);
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
    
    // Adjust active section if needed
    if (activeSection >= updatedSections.length) {
      setActiveSection(updatedSections.length - 1);
    }
  };
  
  const moveSection = (sectionIndex: number, direction: 'up' | 'down') => {
    if (!template) return;
    
    const newIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    
    // Check bounds
    if (newIndex < 0 || newIndex >= template.sections.length) return;
    
    const updatedSections = [...template.sections];
    const sectionToMove = updatedSections[sectionIndex];
    
    // Remove from current position
    updatedSections.splice(sectionIndex, 1);
    // Insert at new position
    updatedSections.splice(newIndex, 0, sectionToMove);
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
    
    // Update active section
    setActiveSection(newIndex);
  };
  
  const addQuestion = (sectionIndex: number) => {
    if (!template) return;
    
    const newQuestion: Question = {
      id: uuidv4(),
      text: 'New Question',
      type: 'text',
      required: false,
      includeRecommendation: false,
    };
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].questions.push(newQuestion);
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    if (!template) return;
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].questions.splice(questionIndex, 1);
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const handleQuestionChange = (
    sectionIndex: number,
    questionIndex: number,
    field: string,
    value: any
  ) => {
    if (!template) return;
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].questions[questionIndex] = {
      ...updatedSections[sectionIndex].questions[questionIndex],
      [field]: value,
    };
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const addOption = (sectionIndex: number, questionIndex: number) => {
    if (!template) return;
    
    const question = template.sections[sectionIndex].questions[questionIndex];
    
    if (!question.options) {
      question.options = [];
    }
    
    const newOption: Option = {
      id: uuidv4(),
      text: 'New Option',
    };
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].questions[questionIndex].options = [
      ...(question.options || []),
      newOption,
    ];
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const removeOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    if (!template) return;
    
    const updatedSections = [...template.sections];
    const question = updatedSections[sectionIndex].questions[questionIndex];
    
    if (question.options) {
      question.options.splice(optionIndex, 1);
    }
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  const handleOptionChange = (
    sectionIndex: number,
    questionIndex: number,
    optionIndex: number,
    field: string,
    value: string
  ) => {
    if (!template) return;
    
    const updatedSections = [...template.sections];
    const question = updatedSections[sectionIndex].questions[questionIndex];
    
    if (question.options) {
      question.options[optionIndex] = {
        ...question.options[optionIndex],
        [field]: value,
      };
    }
    
    setTemplate({
      ...template,
      sections: updatedSections,
    });
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="card mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard/templates" className="btn-primary">
          Back to Templates
        </Link>
      </div>
    );
  }
  
  if (!template && !isNew) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Template Not Found</h2>
        <p className="text-gray-500 mb-4">The template you're looking for doesn't exist or has been removed.</p>
        <Link href="/dashboard/templates" className="btn-primary">
          Back to Templates
        </Link>
      </div>
    );
  }
  
  if (!template) {
    return null;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isNew ? 'Create New Template' : `Edit Template: ${template.name}`}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={handleTemplateSave}
            className="btn-primary flex items-center"
            disabled={isSaving}
          >
            <FiSave className="mr-1" /> {isSaving ? 'Saving...' : 'Save Template'}
          </button>
          <Link href="/dashboard/templates" className="btn-secondary flex items-center">
            <FiArrowLeft className="mr-1" /> Cancel
          </Link>
        </div>
      </div>
      
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Template Information</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              id="name"
              value={template.name}
              onChange={(e) => handleTemplateChange('name', e.target.value)}
              className="form-input w-full"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={template.description}
              onChange={(e) => handleTemplateChange('description', e.target.value)}
              className="form-input w-full"
              rows={3}
            />
          </div>
        </div>
      </div>
      
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Sections</h2>
          <button onClick={addSection} className="btn-secondary text-sm flex items-center">
            <FiPlus className="mr-1" /> Add Section
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {template.sections.map((section, index) => (
            <button
              key={section.id}
              className={`px-3 py-1.5 rounded-full text-sm ${
                activeSection === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 border border-gray-300'
              }`}
              onClick={() => setActiveSection(index)}
            >
              {index + 1}. {section.title}
            </button>
          ))}
        </div>
      </div>
      
      {template.sections.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Edit Section: {template.sections[activeSection].title}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => moveSection(activeSection, 'up')}
                className="btn-icon"
                disabled={activeSection === 0}
              >
                <FiArrowUp />
              </button>
              <button
                onClick={() => moveSection(activeSection, 'down')}
                className="btn-icon"
                disabled={activeSection === template.sections.length - 1}
              >
                <FiArrowDown />
              </button>
              <button
                onClick={() => removeSection(activeSection)}
                className="btn-danger text-sm"
                disabled={template.sections.length <= 1}
              >
                <FiTrash2 className="mr-1" /> Remove Section
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <label htmlFor="sectionTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Section Title *
              </label>
              <input
                type="text"
                id="sectionTitle"
                value={template.sections[activeSection].title}
                onChange={(e) => handleSectionChange(activeSection, 'title', e.target.value)}
                className="form-input w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="sectionDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Section Description
              </label>
              <textarea
                id="sectionDescription"
                value={template.sections[activeSection].description}
                onChange={(e) => handleSectionChange(activeSection, 'description', e.target.value)}
                className="form-input w-full"
                rows={2}
              />
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium">Questions</h3>
              <button
                onClick={() => addQuestion(activeSection)}
                className="btn-secondary text-sm flex items-center"
              >
                <FiPlus className="mr-1" /> Add Question
              </button>
            </div>
            
            {template.sections[activeSection].questions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-500">No questions yet. Click "Add Question" to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {template.sections[activeSection].questions.map((question, questionIndex) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">Question {questionIndex + 1}</h4>
                      <button
                        onClick={() => removeQuestion(activeSection, questionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text *
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) =>
                            handleQuestionChange(activeSection, questionIndex, 'text', e.target.value)
                          }
                          className="form-input w-full"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Type *
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            handleQuestionChange(activeSection, questionIndex, 'type', e.target.value)
                          }
                          className="form-input w-full"
                        >
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="range">Range</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) =>
                            handleQuestionChange(
                              activeSection,
                              questionIndex,
                              'required',
                              e.target.checked
                            )
                          }
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Required</span>
                      </label>
                      
                      <label className="inline-flex items-center ml-6">
                        <input
                          type="checkbox"
                          checked={question.includeRecommendation}
                          onChange={(e) =>
                            handleQuestionChange(
                              activeSection,
                              questionIndex,
                              'includeRecommendation',
                              e.target.checked
                            )
                          }
                          className="form-checkbox"
                        />
                        <span className="ml-2 text-sm">Include in Health Plan</span>
                      </label>
                    </div>
                    
                    {/* Options for select, radio, checkbox types */}
                    {(question.type === 'select' || 
                      question.type === 'radio' || 
                      question.type === 'checkbox') && (
                      <div className="mt-4 border-t pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-sm font-medium">Options</h5>
                          <button
                            onClick={() => addOption(activeSection, questionIndex)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Option
                          </button>
                        </div>
                        
                        {question.options && question.options.length > 0 ? (
                          <div className="space-y-4">
                            {question.options.map((option, optionIndex) => (
                              <div key={option.id} className="bg-white border rounded-md p-3">
                                <div className="flex items-center space-x-2 mb-2">
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) =>
                                      handleOptionChange(
                                        activeSection,
                                        questionIndex,
                                        optionIndex,
                                        'text',
                                        e.target.value
                                      )
                                    }
                                    className="form-input flex-grow"
                                    placeholder="Option text"
                                  />
                                  <button
                                    onClick={() =>
                                      removeOption(activeSection, questionIndex, optionIndex)
                                    }
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                                
                                {question.includeRecommendation && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Recommendation for this answer:
                                    </label>
                                    <textarea
                                      value={option.recommendation || ''}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          activeSection,
                                          questionIndex,
                                          optionIndex,
                                          'recommendation',
                                          e.target.value
                                        )
                                      }
                                      className="form-input w-full"
                                      rows={2}
                                      placeholder="Enter recommendation text for this answer"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No options added yet.</p>
                        )}
                      </div>
                    )}
                    
                    {/* Text, textarea, and range recommendation fields */}
                    {question.includeRecommendation && 
                     (question.type === 'text' || question.type === 'textarea' || question.type === 'range') && (
                      <div className="mt-4 border-t pt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Recommendation:
                        </label>
                        <textarea
                          value={question.defaultRecommendation || ''}
                          onChange={(e) =>
                            handleQuestionChange(
                              activeSection,
                              questionIndex,
                              'defaultRecommendation',
                              e.target.value
                            )
                          }
                          className="form-input w-full"
                          rows={3}
                          placeholder="Enter default recommendation text for free-form responses"
                        />
                        {question.type === 'range' && (
                          <div className="mt-3 bg-gray-50 p-3 rounded text-sm">
                            <p className="text-gray-600">
                              For range questions, you can use {'{value}'} in your recommendation text to include the selected value.
                              <br />
                              Example: "Based on your pain level of {'{value}'}, we recommend..."
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Range min/max for range type */}
                    {question.type === 'range' && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Value
                          </label>
                          <input
                            type="number"
                            value={question.minValue || 0}
                            onChange={(e) =>
                              handleQuestionChange(
                                activeSection,
                                questionIndex,
                                'minValue',
                                parseInt(e.target.value)
                              )
                            }
                            className="form-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Value
                          </label>
                          <input
                            type="number"
                            value={question.maxValue || 10}
                            onChange={(e) =>
                              handleQuestionChange(
                                activeSection,
                                questionIndex,
                                'maxValue',
                                parseInt(e.target.value)
                              )
                            }
                            className="form-input w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 