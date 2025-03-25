// Define types for API responses
interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  insurance?: {
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
  };
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

interface PatientsResponse {
  patients: Patient[];
  pagination: Pagination;
}

interface PatientSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Mock data for fallbacks when API fails
const mockPatients: Patient[] = [
  {
    _id: "patient1",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "1980-01-01",
    gender: "male",
    email: "john.doe@example.com",
    phoneNumber: "555-123-4567",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "patient2",
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: "1985-05-15",
    gender: "female",
    email: "jane.smith@example.com",
    phoneNumber: "555-987-6543",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const isDevelopment = process.env.NODE_ENV === 'development';
const BASE_URL = isDevelopment ? 'http://localhost:8888/.netlify/functions/api' : '/.netlify/functions/api';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
  }
  
  // Parse the JSON response
  const data = await response.json();
  
  // Handle potential nested response structure (common in Netlify Functions)
  // If the response has a success flag and a data property, return the data
  if (data && typeof data === 'object' && data.success === true && data.data) {
    console.log('Found patient data in nested structure');
    return data.data;
  }
  
  return data;
}

// Patient service for client-side API calls
const patientService = {
  // Get all patients with pagination and search
  async getPatients(params: PatientSearchParams = {}): Promise<PatientsResponse> {
    try {
      // Build query string from params
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.sortField) queryParams.append('sortField', params.sortField);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const queryString = queryParams.toString();
      const url = `${BASE_URL}/patients${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching patients with URL:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      const data = await handleResponse(response);
      
      // Log patient API response for debugging
      console.log('Patients API response:', data);
      
      return data;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  },
  
  // Get a specific patient by ID
  async getPatientById(id: string): Promise<Patient> {
    try {
      console.log(`Fetching patient with ID: ${id}`);
      
      // Add timeout to fetch to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(`${BASE_URL}/patients/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
          
          if (response.status === 404) {
            throw new Error('Not found');
          }
          
          throw new Error(
            errorData.error || `Failed to fetch patient (HTTP ${response.status})`
          );
        }
        
        let data;
        try {
          data = await response.json();
          // Log the complete data structure to help debug
          console.log('Raw patient data from API:', JSON.stringify(data));
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          throw new Error('Invalid response format from server');
        }
        
        // Handle potential nested response structure (common in Netlify Functions)
        if (data && typeof data === 'object' && data.success === true && data.data) {
          console.log('Found patient data in nested structure');
          data = data.data;
        }
        
        // Ensure the patient data has an ID
        if (!data || !data._id) {
          console.error('Invalid patient data - missing ID:', data);
          throw new Error('Patient data is incomplete or invalid');
        }
        
        return data;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        
        throw error;
      }
    } catch (error) {
      console.error(`Error fetching patient with id ${id}:`, error);
      throw error;
    }
  },
  
  // Create a new patient
  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    try {
      const response = await fetch(`${BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData?.error || `Failed to create patient (HTTP ${response.status})`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      // Handle potential nested response structure
      if (data && typeof data === 'object' && data.success === true && data.data) {
        console.log('Found patient data in nested structure');
        data = data.data;
      }
      
      // Ensure the new patient has an ID
      if (!data || !data._id) {
        console.error('Invalid patient data after creation - missing ID:', data);
        throw new Error('Patient creation returned incomplete data');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  },
  
  // Update an existing patient
  async updatePatient(id: string, patientData: Partial<Patient>): Promise<Patient> {
    try {
      const response = await fetch(`${BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData?.error || `Failed to update patient (HTTP ${response.status})`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid response format from server');
      }
      
      // Handle potential nested response structure
      if (data && typeof data === 'object' && data.success === true && data.data) {
        console.log('Found patient data in nested structure');
        data = data.data;
      }
      
      return data;
    } catch (error) {
      console.error(`Error updating patient with id ${id}:`, error);
      throw error;
    }
  },
  
  // Delete a patient
  async deletePatient(id: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData?.error || `Failed to delete patient (HTTP ${response.status})`);
      }
      
      // Check if there's a response body to parse
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          await response.json(); // We don't need the data, just checking it can be parsed
        } catch (parseError) {
          console.warn('Empty or invalid JSON response on delete:', parseError);
          // This might be fine - some APIs return empty bodies on DELETE
        }
      }
    } catch (error) {
      console.error(`Error deleting patient with id ${id}:`, error);
      throw error;
    }
  }
};

export type { Patient, PatientsResponse, PatientSearchParams };
export default patientService; 