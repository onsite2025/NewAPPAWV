'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import visitService from '@/services/visitService';
import patientService from '@/services/patientService';

interface AnalyticsSummary {
  totalPatients: number;
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  activeUsers: number;
  averageVisitDuration: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        // Get user role
        const { role } = await userService.getUserRole();
        setUserRole(role);

        // Check permission - only admin and provider can access
        if (role !== 'admin' && role !== 'provider') {
          router.push('/dashboard');
          return;
        }

        // Fetch analytics data
        const [
          patientsResponse,
          completedVisitsResponse,
          pendingVisitsResponse,
          usersResponse
        ] = await Promise.all([
          patientService.getPatients({ limit: 1 }),
          visitService.getVisits({ status: 'completed', limit: 1 }),
          visitService.getVisits({ status: 'scheduled', limit: 1 }),
          userService.getUsers({ status: 'active', limit: 1 })
        ]);

        setAnalytics({
          totalPatients: patientsResponse.pagination.total,
          totalVisits: completedVisitsResponse.pagination.total + pendingVisitsResponse.pagination.total,
          completedVisits: completedVisitsResponse.pagination.total,
          pendingVisits: pendingVisitsResponse.pagination.total,
          activeUsers: usersResponse.pagination.total,
          averageVisitDuration: 30 // Default value, replace with actual calculation
        });
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">No analytics data available</h2>
        <p className="text-gray-500 mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your practice performance</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Patients</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalPatients}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Visits</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalVisits}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Completed Visits</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.completedVisits}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Pending Visits</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.pendingVisits}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.activeUsers}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-medium text-gray-500">Average Visit Duration</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.averageVisitDuration} min</p>
        </div>
      </div>
    </div>
  );
} 