'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import patientService, { Patient } from '@/services/patientService';
import { FiPlusCircle, FiSearch, FiEdit, FiUserPlus } from 'react-icons/fi';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const router = useRouter();

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await patientService.getPatients({
        page: currentPage,
        limit,
        search: searchTerm,
      });
      
      console.log('Patients API response:', response);
      
      setPatients(response.patients);
      setFilteredPatients(response.patients);
      setTotalPages(response.pagination.pages);
      
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [currentPage]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm) {
        // If search term is provided, filter on client-side for immediate feedback
        const lowercasedSearch = searchTerm.toLowerCase();
        const filtered = patients.filter(
          (patient) =>
            patient.firstName?.toLowerCase().includes(lowercasedSearch) ||
            patient.lastName?.toLowerCase().includes(lowercasedSearch) ||
            patient.insurance?.policyNumber?.toLowerCase().includes(lowercasedSearch) ||
            patient.email?.toLowerCase().includes(lowercasedSearch) ||
            patient.phoneNumber?.includes(searchTerm)
        );
        setFilteredPatients(filtered);
        
        // Then fetch from API for more complete results
        fetchPatients();
      } else {
        setFilteredPatients(patients);
        fetchPatients();
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleViewPatient = (id: string) => {
    router.push(`/dashboard/patients/${id}`);
  };

  const formatDateOfBirth = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link href="/dashboard/patients/new" className="btn-primary flex items-center">
          <FiUserPlus className="mr-2" /> Add New Patient
        </Link>
      </div>

      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, ID, email, or phone"
              className="form-input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card mb-4 p-4">
              <div className="h-6 bg-gray-200 rounded mb-3 w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/4"></div>
            </div>
          ))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4">
            {filteredPatients.map((patient) => (
              <div 
                key={patient._id} 
                className="card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewPatient(patient._id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {patient.firstName} {patient.lastName}
                    </h2>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>DOB: {formatDateOfBirth(patient.dateOfBirth)}</p>
                      <p>Gender: {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1) || 'N/A'}</p>
                      {patient.insurance?.policyNumber && (
                        <p>Policy #: {patient.insurance.policyNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {patient.email && (
                      <span className="text-sm text-gray-600">{patient.email}</span>
                    )}
                    {patient.phoneNumber && (
                      <span className="text-sm text-gray-600">{patient.phoneNumber}</span>
                    )}
                    <Link 
                      href={`/dashboard/patients/${patient._id}/edit`}
                      className="text-primary-600 text-sm mt-2 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiEdit className="mr-1" /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-primary-600 text-white'
                }`}
              >
                Previous
              </button>
              
              <span className="text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-primary-600 text-white'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-8">
          <p className="text-gray-500">No patients found matching your search criteria.</p>
          <Link href="/dashboard/patients/new" className="btn-primary mt-4 inline-flex items-center">
            <FiPlusCircle className="mr-2" /> Add New Patient
          </Link>
        </div>
      )}
    </div>
  );
} 