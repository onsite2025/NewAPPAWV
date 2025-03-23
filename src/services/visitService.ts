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
      const url = `/api/visits${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching visits with URL:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch visits');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching visits:', error);
      throw error;
    }
  },
  
  getVisitById: async (id: string): Promise<IVisitResponse> => {
    try {
      console.log(`Fetching visit with ID: ${id}`);
      const response = await fetch(`/api/visits/${id}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch visit');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching visit ${id}:`, error);
      throw error;
    }
  },
  
  createVisit: async (visitData: IVisitCreateRequest): Promise<IVisitResponse> => {
    try {
      console.log('Creating visit with data:', visitData);
      const response = await fetch('/api/visits', {
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
      const response = await fetch(`/api/visits/${id}`, {
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
      const response = await fetch(`/api/visits/${id}`, {
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