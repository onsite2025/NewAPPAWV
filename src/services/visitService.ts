import { format } from 'date-fns';

interface IVisitResponse {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  provider: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  scheduledDate: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  visitType: string;
  templateId?: string;
  responses?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedSections?: number[];
  healthPlan?: {
    recommendations: any[];
    summary: string;
  };
  success?: boolean;
  data?: IVisitResponse;
}

interface IVisitCreateRequest {
  patient: string;
  provider?: string;
  scheduledDate: Date;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  visitType?: string;
  templateId?: string;
  notes?: string;
}

interface IVisitUpdateRequest {
  patient?: string;
  provider?: string;
  scheduledDate?: Date;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  visitType?: string;
  templateId?: string;
  responses?: any;
  notes?: string;
}

interface IPaginationResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface IVisitsResponse {
  visits: IVisitResponse[];
  pagination: IPaginationResponse;
}

interface IVisitSearchParams {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  returnEmptyOnError?: boolean;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const BASE_URL = isDevelopment ? 'http://localhost:8888/.netlify/functions/api' : '/.netlify/functions/api';

// Create a custom error class for better error handling
class ApiError extends Error {
  status: number;
  details?: any;
  
  constructor(message: string, status: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const visitService = {
  getVisits: async (params: IVisitSearchParams = {}): Promise<IVisitsResponse> => {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.patientId) queryParams.append('patientId', params.patientId);
      if (params.status) queryParams.append('status', params.status);
      
      // Handle date filtering with multiple possible parameter names
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      else if (params.startDate) queryParams.append('fromDate', params.startDate);
      
      if (params.toDate) queryParams.append('toDate', params.toDate);
      else if (params.endDate) queryParams.append('toDate', params.endDate);
      
      if (params.sortField) queryParams.append('sortField', params.sortField);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const queryString = queryParams.toString();
      const url = `${BASE_URL}/visits${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching visits with URL:', url);
      
      // Add timeout to fetch to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
          
          throw new ApiError(
            errorData.error || `Failed to fetch visits (HTTP ${response.status})`,
            response.status,
            errorData
          );
        }
        
        const data = await response.json();
        
        // Validate response structure
        if (!data || !Array.isArray(data.visits)) {
          throw new ApiError('Invalid response format from server', 500);
        }
        
        return data;
      } catch (error: any) {
        if (error instanceof ApiError) throw error;
        
        if (error.name === 'AbortError') {
          throw new ApiError('Request timed out. Please try again.', 408);
        }
        
        throw new ApiError(`Failed to fetch visits: ${error.message || 'Unknown error'}`, 500);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
      
      // Return a default empty structure instead of throwing to improve recovery
      if (params.returnEmptyOnError) {
        return {
          visits: [],
          pagination: {
            total: 0,
            page: params.page || 1,
            limit: params.limit || 10,
            pages: 0
          }
        };
      }
      
      throw error;
    }
  },
  
  getVisitById: async (id: string): Promise<IVisitResponse> => {
    if (!id) {
      throw new ApiError('Visit ID is required', 400);
    }
    
    try {
      console.log(`Fetching visit with ID: ${id}`);
      
      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(`${BASE_URL}/visits/${id}`, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-store'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
          
          if (response.status === 404) {
            throw new ApiError('Visit not found', 404, errorData);
          }
          
          throw new ApiError(
            errorData.error || `Failed to fetch visit (HTTP ${response.status})`,
            response.status,
            errorData
          );
        }
        
        let data;
        try {
          data = await response.json();
          // Log the complete data structure to help debug
          console.log('Raw response data from API:', JSON.stringify(data));
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          throw new ApiError('Invalid response format from server', 500);
        }
        
        // Validate essential properties to ensure we have valid data
        if (!data || typeof data !== 'object') {
          console.error('Empty or invalid response data:', data);
          throw new ApiError('Empty or invalid response data', 500);
        }

        // First check for the nested structure (which is what Netlify functions return)
        if (data.success === true && data.data && typeof data.data === 'object') {
          console.log('Found visit in nested data structure');
          data = data.data;
        }
        
        // Be more flexible with ID field - it could be _id, id, or visitId
        const visitId = data._id || data.id || data.visitId;
        if (!visitId) {
          console.error('Invalid visit data - missing ID field:', data);
          throw new ApiError('Visit data is incomplete or invalid', 500);
        }
        
        // If we reach here, ensure the _id field exists 
        // (normalize data format to have _id consistently)
        if (!data._id && (data.id || data.visitId)) {
          data._id = data.id || data.visitId;
        }
        
        // Ensure patient data is valid
        if (!data.patient || typeof data.patient !== 'object') {
          console.error('Invalid patient data in visit:', data);
          data.patient = {
            _id: 'unknown',
            firstName: 'Unknown',
            lastName: 'Patient',
            dateOfBirth: ''
          };
        }
        
        // Ensure responses object exists
        if (!data.responses) {
          data.responses = {};
        }
        
        console.log('Visit data loaded:', data);
        return data;
      } catch (error: any) {
        if (error instanceof ApiError) throw error;
        
        if (error.name === 'AbortError') {
          throw new ApiError('Request timed out. Please try again.', 408);
        }
        
        throw new ApiError(`Failed to fetch visit: ${error.message || 'Unknown error'}`, 500);
      }
    } catch (error) {
      console.error(`Error fetching visit ${id}:`, error);
      throw error;
    }
  },
  
  createVisit: async (visitData: IVisitCreateRequest): Promise<IVisitResponse> => {
    try {
      console.log('Creating visit with data:', visitData);
      const response = await fetch(`${BASE_URL}/visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create visit');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  },
  
  updateVisit: async (id: string, visitData: IVisitUpdateRequest): Promise<IVisitResponse> => {
    try {
      console.log(`Updating visit ${id} with data:`, visitData);
      const response = await fetch(`${BASE_URL}/visits/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update visit');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error updating visit ${id}:`, error);
      throw error;
    }
  },
  
  deleteVisit: async (id: string): Promise<void> => {
    try {
      console.log(`Deleting visit with ID: ${id}`);
      const response = await fetch(`${BASE_URL}/visits/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete visit');
      }
    } catch (error) {
      console.error(`Error deleting visit ${id}:`, error);
      throw error;
    }
  },
  
  // Format a date to display in the UI
  formatDate: (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy - h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }
};

export type { 
  IVisitResponse, 
  IVisitCreateRequest, 
  IVisitUpdateRequest, 
  IVisitsResponse, 
  IVisitSearchParams 
};
export default visitService; 