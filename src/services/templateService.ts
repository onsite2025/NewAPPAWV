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

interface Template {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  sections: any[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  createdBy: string | null;
  version: number;
}

interface TemplatesResponse {
  templates: Template[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface TemplateSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

const BASE_URL = '/.netlify/functions/api';

const templateService = {
  async getTemplates(params: TemplateSearchParams = {}): Promise<TemplatesResponse> {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.sortField) queryParams.append('sortField', params.sortField);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const queryString = queryParams.toString();
      const url = `${BASE_URL}/templates${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching templates with URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      
      // Convert date strings to Date objects
      data.templates = data.templates.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      }));
      
      return data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  async getTemplateById(id: string): Promise<Template> {
    try {
      const response = await fetch(`${BASE_URL}/templates/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const data = await response.json();
      
      // Convert date strings to Date objects
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    } catch (error) {
      console.error(`Error fetching template ${id}:`, error);
      throw error;
    }
  },

  async createTemplate(templateData: Omit<Template, '_id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    try {
      const response = await fetch(`${BASE_URL}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  async updateTemplate(id: string, templateData: Partial<Template>): Promise<Template> {
    try {
      const response = await fetch(`${BASE_URL}/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating template ${id}:`, error);
      throw error;
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/templates/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      throw error;
    }
  }
};

export type { Template, TemplatesResponse, TemplateSearchParams };
export default templateService; 