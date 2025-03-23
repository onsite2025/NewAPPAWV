import { ITemplate, ITemplateResponse } from '@/models/Template';
import { v4 as uuidv4 } from '@/utils/uuid';

const isDevelopment = process.env.NODE_ENV === 'development';
const LOCAL_STORAGE_KEY = 'templates';

// Utility functions for localStorage
const getLocalTemplates = (): ITemplateResponse[] => {
  if (typeof window === 'undefined') return [];
  try {
    const templates = localStorage.getItem(LOCAL_STORAGE_KEY);
    return templates ? JSON.parse(templates) : [];
  } catch (error) {
    console.error('Error parsing templates from localStorage:', error);
    return [];
  }
};

const saveLocalTemplates = (templates: ITemplateResponse[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving templates to localStorage:', error);
  }
};

const templateService = {
  getTemplates: async (search?: string): Promise<ITemplateResponse[]> => {
    try {
      const queryParams = search ? `?name=${encodeURIComponent(search)}` : '';
      const response = await fetch(`/api/templates${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from API:', errorData);
        throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      if (isDevelopment) {
        console.log('Using localStorage as fallback in development mode');
        const templates = getLocalTemplates();
        if (search) {
          return templates.filter(t => 
            t.name.toLowerCase().includes(search.toLowerCase())
          );
        }
        return templates;
      }
      throw error;
    }
  },

  getTemplateById: async (id: string): Promise<ITemplateResponse | null> => {
    try {
      const response = await fetch(`/api/templates/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Error response from API for template ${id}:`, errorData);
        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching template ${id}:`, error);
      if (isDevelopment) {
        console.log('Using localStorage as fallback in development mode');
        const templates = getLocalTemplates();
        return templates.find(t => t._id === id || t.id === id) || null;
      }
      throw error;
    }
  },

  createTemplate: async (template: Omit<ITemplateResponse, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<ITemplateResponse> => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from API when creating template:', errorData);
        throw new Error(`Failed to create template: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      if (isDevelopment) {
        console.log('Using localStorage as fallback in development mode');
        const newTemplate: ITemplateResponse = {
          ...template,
          _id: uuidv4(),
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const templates = getLocalTemplates();
        templates.push(newTemplate);
        saveLocalTemplates(templates);
        return newTemplate;
      }
      throw error;
    }
  },

  updateTemplate: async (id: string, template: Partial<ITemplateResponse>): Promise<ITemplateResponse> => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Error response from API when updating template ${id}:`, errorData);
        throw new Error(`Failed to update template: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error updating template ${id}:`, error);
      if (isDevelopment) {
        console.log('Using localStorage as fallback in development mode');
        const templates = getLocalTemplates();
        const index = templates.findIndex(t => t._id === id || t.id === id);
        
        if (index === -1) {
          throw new Error('Template not found in localStorage');
        }
        
        const updatedTemplate: ITemplateResponse = {
          ...templates[index],
          ...template,
          updatedAt: new Date()
        };
        
        templates[index] = updatedTemplate;
        saveLocalTemplates(templates);
        return updatedTemplate;
      }
      throw error;
    }
  },

  deleteTemplate: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Error response from API when deleting template ${id}:`, errorData);
        throw new Error(`Failed to delete template: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      if (isDevelopment) {
        console.log('Using localStorage as fallback in development mode');
        const templates = getLocalTemplates();
        const filteredTemplates = templates.filter(t => t._id !== id && t.id !== id);
        saveLocalTemplates(filteredTemplates);
        return;
      }
      throw error;
    }
  }
};

export default templateService; 