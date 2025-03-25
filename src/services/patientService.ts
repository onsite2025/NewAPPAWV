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
  return response.json();
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
      
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  },
  
  // Get a specific patient by ID
  async getPatientById(id: string): Promise<Patient> {
    try {
      const response = await fetch(`${BASE_URL}/patients/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      return await handleResponse(response);
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
      
      return await handleResponse(response);
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
      
      return await handleResponse(response);
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
      
      await handleResponse(response);
    } catch (error) {
      console.error(`Error deleting patient with id ${id}:`, error);
      throw error;
    }
  }
};

export type { Patient, PatientsResponse, PatientSearchParams };
export default patientService; 