'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import patientService from '@/services/patientService';
import visitService from '@/services/visitService';
import templateService from '@/services/templateService';

interface DashboardStats {
  recentVisits: {
    _id: string;
    patientName: string;
    date: string;
    status: string;
  }[];
  upcomingVisits: {
    _id: string;
    patientName: string;
    date: string;
  }[];
  stats: {
    totalPatients: number;
    completedVisits: number;
    pendingVisits: number;
    templates: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get patients count
      const patientsResponse = await patientService.getPatients({ limit: 1 });
      const totalPatients = patientsResponse?.pagination?.total || 0;
      
      // Get recent completed visits (last 3)
      const recentVisitsResponse = await visitService.getVisits({ 
        status: 'completed', 
        limit: 3,
        sortField: 'scheduledDate',
        sortOrder: 'desc'
      });
      
      // Get upcoming visits (next 3)
      const upcomingVisitsResponse = await visitService.getVisits({ 
        status: 'scheduled', 
        limit: 3,
        sortField: 'scheduledDate',
        sortOrder: 'asc'
      });
      
      // Get completed visits count
      const completedVisitsResponse = await visitService.getVisits({ 
        status: 'completed', 
        limit: 1
      });
      const completedVisits = completedVisitsResponse?.pagination?.total || 0;
      
      // Get pending visits count
      const pendingVisitsResponse = await visitService.getVisits({ 
        status: 'scheduled', 
        limit: 1
      });
      const pendingVisits = pendingVisitsResponse?.pagination?.total || 0;

      // Format recent visits
      const recentVisits = (recentVisitsResponse?.visits || []).map(visit => ({
        _id: visit._id,
        patientName: typeof visit.patient === 'object' && visit.patient !== null
          ? `${visit.patient.firstName || ''} ${visit.patient.lastName || ''}`.trim() || 'Unknown Patient'
          : 'Unknown Patient',
        date: visit.scheduledDate,
        status: visit.status
      }));
      
      // Format upcoming visits
      const upcomingVisits = (upcomingVisitsResponse?.visits || []).map(visit => ({
        _id: visit._id,
        patientName: typeof visit.patient === 'object' && visit.patient !== null
          ? `${visit.patient.firstName || ''} ${visit.patient.lastName || ''}`.trim() || 'Unknown Patient'
          : 'Unknown Patient',
        date: visit.scheduledDate
      }));
      
      // Get templates count using the template service
      const templatesResponse = await templateService.getTemplates({ limit: 1 });
      const templatesCount = templatesResponse?.pagination?.total || 0;
      
      // Set the dashboard stats
      setStats({
        recentVisits,
        upcomingVisits,
        stats: {
          totalPatients,
          completedVisits,
          pendingVisits,
          templates: templatesCount
        }
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-gray-200 h-64 rounded"></div>
          </div>
          <div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-gray-200 h-64 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-6">Welcome, {user?.email}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card flex flex-col">
            <div className="text-sm text-gray-500 mb-2">Total Patients</div>
            <div className="text-3xl font-bold text-primary-700">{stats?.stats.totalPatients || 0}</div>
            <Link href="/dashboard/patients" className="text-primary-600 text-sm mt-auto">
              View all patients
            </Link>
          </div>
          
          <div className="card flex flex-col">
            <div className="text-sm text-gray-500 mb-2">Completed Visits</div>
            <div className="text-3xl font-bold text-green-600">{stats?.stats.completedVisits || 0}</div>
            <Link href="/dashboard/visits?status=completed" className="text-primary-600 text-sm mt-auto">
              View completed visits
            </Link>
          </div>
          
          <div className="card flex flex-col">
            <div className="text-sm text-gray-500 mb-2">Pending Visits</div>
            <div className="text-3xl font-bold text-amber-500">{stats?.stats.pendingVisits || 0}</div>
            <Link href="/dashboard/visits?status=scheduled" className="text-primary-600 text-sm mt-auto">
              View pending visits
            </Link>
          </div>
          
          <div className="card flex flex-col">
            <div className="text-sm text-gray-500 mb-2">Assessment Templates</div>
            <div className="text-3xl font-bold text-purple-600">{stats?.stats.templates || 0}</div>
            <Link href="/dashboard/templates" className="text-primary-600 text-sm mt-auto">
              View templates
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Visits</h2>
            <Link href="/dashboard/visits?status=completed" className="text-primary-600 text-sm">
              View all
            </Link>
          </div>
          
          <div className="card">
            {!stats?.recentVisits || stats.recentVisits.length === 0 ? (
              <p className="text-gray-500">No recent visits found.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {stats.recentVisits.map((visit) => (
                  <li key={visit._id} className="py-3 flex justify-between">
                    <div>
                      <p className="font-medium">{visit.patientName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(visit.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm bg-green-100 text-green-800 py-1 px-2 rounded">
                        {visit.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Upcoming Visits</h2>
            <Link href="/dashboard/visits?status=scheduled" className="text-primary-600 text-sm">
              View all
            </Link>
          </div>
          
          <div className="card">
            {!stats?.upcomingVisits || stats.upcomingVisits.length === 0 ? (
              <p className="text-gray-500">No upcoming visits scheduled.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {stats.upcomingVisits.map((visit) => (
                  <li key={visit._id} className="py-3">
                    <p className="font-medium">{visit.patientName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(visit.date).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-center">
        <Link 
          href="/dashboard/visits/new"
          className="btn-primary flex items-center justify-center"
        >
          Schedule New Visit
        </Link>
      </div>
    </div>
  );
} 