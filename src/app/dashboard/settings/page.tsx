'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiActivity, FiCpu, FiSettings, FiShield, FiUsers } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

interface UserRole {
  role: 'admin' | 'provider' | 'staff';
  id: string;
  email: string;
}

// This would come from your API in a real application
const getUserRole = async (userId: string): Promise<UserRole> => {
  // For now, we'll simulate an API call
  // In a real app, you would fetch this from your backend
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate different roles - this is just for demonstration
      // userID ending with 1 = admin, 2 = provider, else = staff
      const lastChar = userId.charAt(userId.length - 1);
      const role = lastChar === '1' ? 'admin' : 
                  lastChar === '2' ? 'provider' : 'staff';
      
      resolve({
        role: role as 'admin' | 'provider' | 'staff',
        id: userId,
        email: 'user@example.com' // This would come from the user object in a real app
      });
    }, 500);
  });
};

const tabs = [
  {
    name: 'Profile',
    href: '/dashboard/settings/profile',
    icon: <FiUser className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider', 'staff']
  },
  {
    name: 'Practice',
    href: '/dashboard/settings/practice',
    icon: <FiActivity className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider', 'staff']
  },
  {
    name: 'Users',
    href: '/dashboard/settings/users',
    icon: <FiUsers className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider']
  },
  {
    name: 'Template Management',
    href: '/dashboard/settings/templates',
    icon: <FiSettings className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider']
  },
  {
    name: 'Integrations',
    href: '/dashboard/settings/integrations',
    icon: <FiCpu className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider', 'staff']
  },
  {
    name: 'Security',
    href: '/dashboard/settings/security',
    icon: <FiShield className="w-5 h-5" />,
    allowedRoles: ['admin', 'provider', 'staff']
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the user's role when the component mounts
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getUserRole(user.uid)
        .then(role => {
          setUserRole(role);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching user role:', error);
          setIsLoading(false);
        });
    }
  }, [user]);

  // Filter tabs based on user's role
  const accessibleTabs = tabs.filter(tab => 
    userRole && tab.allowedRoles.includes(userRole.role)
  );

  // Redirect to the first accessible tab if we're on the main settings page
  useEffect(() => {
    if (!isLoading && accessibleTabs.length > 0) {
      router.push(accessibleTabs[0].href);
    }
  }, [accessibleTabs, isLoading, router]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-1 sm:p-2">
          <div className="flex flex-wrap gap-2">
            {accessibleTabs.map((tab) => (
              <Link
                key={tab.name}
                href={tab.href}
                className="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="mr-2 text-gray-500">{tab.icon}</span>
                <span>{tab.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 