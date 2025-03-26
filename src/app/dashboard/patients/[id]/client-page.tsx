'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  medicalRecordNumber?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  insuranceInfo?: {
    provider?: string;
    policyNumber?: string;
    groupNumber?: string;
  };
}

interface Visit {
  id: string;
  date: string;
  status: string;
  provider: string;
  template: string;
}

// Mock data for demonstration
const mockPatients: { [key: string]: Patient } = {
  '1': {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1975-05-15',
    gender: 'male',
    medicalRecordNumber: 'MRN12345',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
    },
    insuranceInfo: {
      provider: 'Blue Cross',
      policyNumber: 'BC-12345678',
      groupNumber: 'G-87654321',
    },
  },
  '2': {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1982-08-23',
    gender: 'female',
    medicalRecordNumber: 'MRN23456',
    email: 'jane.smith@example.com',
    phone: '555-234-5678',
    address: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      state: 'NY',
      zipCode: '67890',
    },
    insuranceInfo: {
      provider: 'Aetna',
      policyNumber: 'AE-87654321',
      groupNumber: 'G-12345678',
    },
  },
};

const mockVisits: { [key: string]: Visit[] } = {
  '1': [
    {
      id: 'v1',
      date: '2023-02-15',
      status: 'completed',
      provider: 'Dr. Sarah Johnson',
      template: 'Annual Wellness Visit',
    },
    {
      id: 'v2',
      date: '2023-06-10',
      status: 'completed',
      provider: 'Dr. Michael Chen',
      template: 'Hypertension Follow-up',
    },
    {
      id: 'v3',
      date: '2023-11-05',
      status: 'scheduled',
      provider: 'Dr. Sarah Johnson',
      template: 'Annual Wellness Visit',
    },
  ],
  '2': [
    {
      id: 'v4',
      date: '2023-03-20',
      status: 'completed',
      provider: 'Dr. Michael Chen',
      template: 'Annual Wellness Visit',
    },
    {
      id: 'v5',
      date: '2023-08-15',
      status: 'completed',
      provider: 'Dr. Sarah Johnson',
      template: 'Diabetes Management',
    },
  ],
};

export default function PatientDetailClient({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const patientId = params.id;

  useEffect(() => {
    // In a real app, this would be an API call
    setTimeout(() => {
      if (patientId && mockPatients[patientId]) {
        setPatient(mockPatients[patientId]);
        setVisits(mockVisits[patientId] || []);
      }
      setIsLoading(false);
    }, 500);
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="card mb-6">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
          </div>
        </div>
        <div className="card">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">Patient not found.</p>
        <Link href="/dashboard/patients" className="btn-primary mt-4 inline-block">
          Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {patient.firstName} {patient.lastName}
        </h1>
        <div className="flex gap-3">
          <Link href={`/dashboard/patients/${patient.id}/edit`} className="btn-secondary">
            Edit Patient
          </Link>
          <Link href={`/dashboard/visits/new?patientId=${patient.id}`} className="btn-primary">
            Schedule Visit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="text-gray-600">Name:</div>
            <div>
              {patient.firstName} {patient.lastName}
            </div>

            <div className="text-gray-600">Date of Birth:</div>
            <div>{new Date(patient.dateOfBirth).toLocaleDateString()}</div>

            <div className="text-gray-600">Gender:</div>
            <div>{patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}</div>

            <div className="text-gray-600">MRN:</div>
            <div>{patient.medicalRecordNumber || 'N/A'}</div>

            <div className="text-gray-600">Email:</div>
            <div>{patient.email || 'N/A'}</div>

            <div className="text-gray-600">Phone:</div>
            <div>{patient.phone || 'N/A'}</div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Address</h3>
            <div>
              {patient.address?.street ? (
                <>
                  <p>{patient.address.street}</p>
                  <p>
                    {patient.address.city}, {patient.address.state} {patient.address.zipCode}
                  </p>
                </>
              ) : (
                <p className="text-gray-500">No address on file</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-2">Insurance Information</h3>
            {patient.insuranceInfo?.provider ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-gray-600">Provider:</div>
                <div>{patient.insuranceInfo.provider}</div>

                <div className="text-gray-600">Policy Number:</div>
                <div>{patient.insuranceInfo.policyNumber}</div>

                <div className="text-gray-600">Group Number:</div>
                <div>{patient.insuranceInfo.groupNumber}</div>
              </div>
            ) : (
              <p className="text-gray-500">No insurance information on file</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Visit History</h2>
        {visits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Provider</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {new Date(visit.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">{visit.template}</td>
                    <td className="px-4 py-2">{visit.provider}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`py-1 px-2 rounded text-xs ${
                          visit.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : visit.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/visits/${visit.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No visit history found.</p>
        )}
      </div>
    </div>
  );
} 