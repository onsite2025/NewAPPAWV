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
  createdAt: string;
  updatedAt: string;
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

// Patient service for client-side API calls
const patientService = {
  // Get all patients with pagination and search
  async getPatients(params: PatientSearchParams = {}): Promise<PatientsResponse> {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortField) queryParams.append('sortField', params.sortField);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = `/api/patients${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch patients');
    }
    
    return await response.json();
  },
  
  // Get a specific patient by ID
  async getPatientById(id: string): Promise<Patient> {
    const response = await fetch(`/api/patients/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch patient');
    }
    
    return await response.json();
  },
  
  // Create a new patient
  async createPatient(patientData: Partial<Patient>): Promise<Patient> {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create patient');
    }
    
    return await response.json();
  },
  
  // Update an existing patient
  async updatePatient(id: string, patientData: Partial<Patient>): Promise<Patient> {
    const response = await fetch(`/api/patients/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update patient');
    }
    
    return await response.json();
  },
  
  // Delete a patient
  async deletePatient(id: string): Promise<void> {
    const response = await fetch(`/api/patients/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete patient');
    }
  }
};

export type { Patient, PatientsResponse, PatientSearchParams };
export default patientService; 