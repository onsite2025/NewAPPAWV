'use client';

// Prevent static rendering of this route
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FiPlus, 
  FiSearch, 
  FiFilter, 
  FiCalendar, 
  FiClock, 
  FiFileText, 
  FiCheck, 
  FiLoader, 
  FiEye, 
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiSlash
} from 'react-icons/fi';
import visitService, { IVisitResponse, IVisitSearchParams } from '@/services/visitService';
import patientService from '@/services/patientService';
import { format } from 'date-fns';

interface VisitFilter {
  search: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function VisitsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  
  const [visits, setVisits] = useState<IVisitResponse[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<IVisitResponse[]>([]);
  const [filters, setFilters] = useState<VisitFilter>({
    search: '',
    status: initialStatus,
    dateRange: {
      start: '',
      end: '',
    },
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const fetchVisits = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params: IVisitSearchParams = {
        page: currentPage,
        limit: 10
      };
      
      if (filters.status) {
        params.status = filters.status;
      }
      
      if (filters.dateRange.start) {
        params.startDate = filters.dateRange.start;
      }
      
      if (filters.dateRange.end) {
        params.endDate = filters.dateRange.end;
      }
      
      const response = await visitService.getVisits(params);
      setVisits(response.visits);
      setFilteredVisits(response.visits);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setError('Failed to load visits. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchVisits();
  }, [currentPage, filters.status, filters.dateRange.start, filters.dateRange.end]);
  
  useEffect(() => {
    if (!filters.search.trim()) {
      setFilteredVisits(visits);
      return;
    }
    
    const search = filters.search.toLowerCase();
    const debounceTimeout = setTimeout(() => {
      const filtered = visits.filter(visit => {
        const patientName = visit.patient 
          ? `${visit.patient.firstName} ${visit.patient.lastName}`.toLowerCase() 
          : '';
        
        return patientName.includes(search);
      });
      
      setFilteredVisits(filtered);
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [filters.search, visits]);

  const handleFilterChange = (field: keyof VisitFilter, value: any) => {
    if (field === 'dateRange') {
      setFilters({
        ...filters,
        dateRange: { ...filters.dateRange, ...value },
      });
    } else {
      setFilters({
        ...filters,
        [field]: value,
      });
    }
    
    if (field !== 'search') {
      setCurrentPage(1);
    }
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateRange: {
        start: '',
        end: '',
      },
    });
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'badge-blue';
      case 'completed':
        return 'badge-green';
      case 'cancelled':
        return 'badge-red';
      case 'no-show':
        return 'badge-yellow';
      default:
        return 'badge-gray';
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (date: string) => {
    try {
      return format(new Date(date), 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Visits</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all patient visits</p>
        </div>
        <Link href="/dashboard/visits/new" className="btn-primary self-start sm:self-auto">
          <FiPlus className="h-4 w-4" />
          <span>New Visit</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search patient name..."
              className="form-input pl-10"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <button
            onClick={toggleFilters}
            className="sm:hidden flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiFilter className="h-4 w-4" />
            <span>Filters</span>
            {(filters.status || filters.dateRange.start || filters.dateRange.end) && (
              <span className="bg-primary-100 text-primary-800 text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </button>
          
          <div className="hidden sm:flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-input min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  placeholder="From"
                  className="form-input pl-10 w-32"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
                />
              </div>
              <span className="text-gray-500">-</span>
              <input
                type="date"
                placeholder="To"
                className="form-input w-32"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
              />
            </div>
            
            {(filters.status || filters.dateRange.start || filters.dateRange.end) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <FiX className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div className="p-4 border-t border-gray-200 sm:hidden space-y-4">
            <div>
              <label className="form-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-input"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Date Range</label>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    placeholder="From"
                    className="form-input pl-10"
                    value={filters.dateRange.start}
                    onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    placeholder="To"
                    className="form-input pl-10"
                    value={filters.dateRange.end}
                    onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <FiX className="h-4 w-4" />
                <span>Clear filters</span>
              </button>
              
              <button
                onClick={toggleFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiCalendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No visits found</h3>
          <p className="text-gray-500 mb-6">
            {filters.search || filters.status || filters.dateRange.start || filters.dateRange.end 
              ? "No visits match your current filters. Try adjusting your search criteria." 
              : "There are no visits scheduled yet. Get started by creating a new visit."}
          </p>
          <Link href="/dashboard/visits/new" className="btn-primary inline-flex">
            <FiPlus className="h-4 w-4" />
            <span>New Visit</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {filteredVisits.map((visit) => (
              <div 
                key={visit._id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700">
                          <FiUser className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="truncate">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : 'Unknown Patient'}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 gap-1">
                          <span className={`badge ${getStatusBadge(visit.status)}`}>
                            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{formatDate(visit.scheduledDate)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{formatTime(visit.scheduledDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Link 
                      href={`/dashboard/visits/${visit._id}/conduct`}
                      className={`btn-secondary py-1.5 px-3 text-sm ${visit.status !== 'scheduled' ? 'opacity-50 pointer-events-none' : ''}`}
                      aria-disabled={visit.status !== 'scheduled'}
                    >
                      {visit.status === 'scheduled' ? (
                        <>
                          <FiFileText className="h-4 w-4" />
                          <span>Conduct</span>
                        </>
                      ) : (
                        <>
                          <FiSlash className="h-4 w-4" />
                          <span>{visit.status === 'completed' ? 'Completed' : 'Unavailable'}</span>
                        </>
                      )}
                    </Link>
                    
                    <Link
                      href={`/dashboard/visits/${visit._id}`}
                      className="btn-primary py-1.5 px-3 text-sm"
                    >
                      <FiEye className="h-4 w-4" />
                      <span>View</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-md border ${
                    currentPage === 1
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-label="Previous page"
                >
                  <FiChevronLeft className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-md border ${
                    currentPage === totalPages
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-label="Next page"
                >
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 