'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiCalendar, FiClock, FiUser, FiClipboard } from 'react-icons/fi';
import patientService from '@/services/patientService';
import visitService, { IVisitCreateRequest } from '@/services/visitService';
import templateService from '@/services/templateService';
import { ITemplateResponse } from '@/models/Template';

interface VisitFormData {
  patientId: string;
  templateId: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
}

type Template = ITemplateResponse;

export default function NewVisitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  
  const [formData, setFormData] = useState<VisitFormData>({
    patientId: patientId || '',
    templateId: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  });
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch patients
    const fetchPatients = async () => {
      try {
        const response = await patientService.getPatients({ limit: 100 });
        setPatients(response.patients);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patients');
      }
    };
    
    // Fetch templates
    const fetchTemplates = async () => {
      try {
        const templates = await templateService.getTemplates();
        setTemplates(templates);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
      }
    };
    
    fetchPatients();
    fetchTemplates();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Combine date and time into a single Date object
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      console.log('Scheduled date time:', scheduledDateTime);
      
      const visitData: IVisitCreateRequest = {
        patient: formData.patientId,
        scheduledDate: scheduledDateTime,
        templateId: formData.templateId,
        notes: formData.notes,
      };
      
      console.log('About to create visit with data:', JSON.stringify(visitData, null, 2));
      const response = await visitService.createVisit(visitData);
      console.log('Visit created successfully:', response);
      
      // Redirect to visits list on success
      router.push('/dashboard/visits');
    } catch (err: any) {
      console.error('Error creating visit:', err);
      setError(err.message || 'Failed to create visit');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getPatientFullName = (patient: Patient) => {
    return `${patient.firstName} ${patient.lastName}`;
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schedule New Visit</h1>
        <Link href="/dashboard/visits" className="btn-secondary">
          Cancel
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
              Patient <span className="text-red-500">*</span>
            </label>
            <select
              id="patientId"
              name="patientId"
              className="form-input"
              value={formData.patientId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Patient</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {getPatientFullName(patient)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Template <span className="text-red-500">*</span>
            </label>
            <select
              id="templateId"
              name="templateId"
              className="form-input"
              value={formData.templateId}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Template</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="text-gray-400" />
              </div>
              <input
                type="date"
                id="scheduledDate"
                name="scheduledDate"
                className="form-input pl-10"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiClock className="text-gray-400" />
              </div>
              <input
                type="time"
                id="scheduledTime"
                name="scheduledTime"
                className="form-input pl-10"
                value={formData.scheduledTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="form-input"
              placeholder="Enter any additional notes about this visit"
              value={formData.notes}
              onChange={handleInputChange}
            ></textarea>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Scheduling...' : 'Schedule Visit'}
          </button>
        </div>
      </form>
    </div>
  );
} 