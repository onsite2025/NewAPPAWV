'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import patientService, { Patient } from '@/services/patientService';

interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
}

export default function EditPatientPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const isEditMode = patientId !== 'new';
  
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    insurance: {
      provider: '',
      policyNumber: '',
      groupNumber: '',
    }
  });
  
  useEffect(() => {
    const fetchPatient = async () => {
      if (isEditMode) {
        try {
          setIsLoading(true);
          setError(null);
          const patient = await patientService.getPatientById(patientId);
          
          setFormData({
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
            gender: patient.gender || '',
            email: patient.email || '',
            phoneNumber: patient.phoneNumber || '',
            address: {
              street: patient.address?.street || '',
              city: patient.address?.city || '',
              state: patient.address?.state || '',
              zipCode: patient.address?.zipCode || '',
            },
            insurance: {
              provider: patient.insurance?.provider || '',
              policyNumber: patient.insurance?.policyNumber || '',
              groupNumber: patient.insurance?.groupNumber || '',
            }
          });
        } catch (err) {
          console.error('Error fetching patient:', err);
          setError('Failed to load patient data. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchPatient();
  }, [isEditMode, patientId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle nested properties with dot notation (e.g., 'address.street')
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof PatientFormData] as Record<string, string>),
          [child]: value
        }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      const patientData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        address: {
          street: formData.address.street || undefined,
          city: formData.address.city || undefined,
          state: formData.address.state || undefined,
          zipCode: formData.address.zipCode || undefined,
        },
        insurance: {
          provider: formData.insurance.provider || undefined,
          policyNumber: formData.insurance.policyNumber || undefined,
          groupNumber: formData.insurance.groupNumber || undefined,
        }
      };
      
      if (isEditMode) {
        await patientService.updatePatient(patientId, patientData);
      } else {
        await patientService.createPatient(patientData);
      }
      
      // Navigate to the patients list after successful save
      router.push('/dashboard/patients');
    } catch (err) {
      console.error('Error saving patient:', err);
      setError('Failed to save patient. Please try again.');
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="card">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'Edit Patient' : 'Add New Patient'}
        </h1>
        {isEditMode && (
          <Link href={`/dashboard/patients/${patientId}`} className="btn-secondary">
            Cancel
          </Link>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            
            <div className="mb-4">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
            
            <div className="mb-4">
              <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                id="address.street"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                id="address.city"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="address.state"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  id="address.zipCode"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            
            <h3 className="text-md font-medium mb-3 mt-6">Insurance Information</h3>
            
            <div className="mb-4">
              <label htmlFor="insurance.provider" className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Provider
              </label>
              <input
                type="text"
                id="insurance.provider"
                name="insurance.provider"
                value={formData.insurance.provider}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="insurance.policyNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Policy Number
              </label>
              <input
                type="text"
                id="insurance.policyNumber"
                name="insurance.policyNumber"
                value={formData.insurance.policyNumber}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="insurance.groupNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Group Number
              </label>
              <input
                type="text"
                id="insurance.groupNumber"
                name="insurance.groupNumber"
                value={formData.insurance.groupNumber}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Link
            href={isEditMode ? `/dashboard/patients/${patientId}` : '/dashboard/patients'}
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  );
} 