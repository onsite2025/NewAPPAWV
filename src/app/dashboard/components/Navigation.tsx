'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FiHome, 
  FiUsers, 
  FiCalendar, 
  FiFileText, 
  FiSettings, 
  FiLogOut,
  FiMenu,
  FiX,
  FiActivity,
  FiLayers,
  FiBarChart2,
  FiCpu,
  FiUser,
  FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <FiHome className="w-5 h-5" />,
  },
  {
    label: 'Patients',
    href: '/dashboard/patients',
    icon: <FiUsers className="w-5 h-5" />,
  },
  {
    label: 'Visits',
    href: '/dashboard/visits',
    icon: <FiCalendar className="w-5 h-5" />,
  },
  {
    label: 'Templates',
    href: '/dashboard/templates',
    icon: <FiFileText className="w-5 h-5" />,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: <FiBarChart2 className="w-5 h-5" />,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <FiSettings className="w-5 h-5" />,
    submenu: [
      {
        label: 'User Management',
        href: '/dashboard/settings/users',
        icon: <FiUsers className="w-4 h-4" />,
      },
      {
        label: 'Practice Settings',
        href: '/dashboard/settings/practice',
        icon: <FiActivity className="w-4 h-4" />,
      },
    ],
  },
];

interface NavigationProps {
  isMobile?: boolean;
  closeSidebar?: () => void;
}

export default function Navigation({ isMobile = false, closeSidebar = () => {} }: NavigationProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  
  // Auto-expand submenu based on active path
  useEffect(() => {
    for (const item of navItems) {
      if (item.submenu) {
        for (const subItem of item.submenu) {
          if (pathname === subItem.href || pathname?.startsWith(`${subItem.href}/`)) {
            setExpandedSubmenu(item.label);
            break;
          }
        }
      }
    }
  }, [pathname]);
  
  const getUserInitials = () => {
    if (!user || !user.email) return '?';
    
    return user.email.charAt(0).toUpperCase();
  };
  
  const handleLogout = async () => {
    await logout();
  };
  
  const toggleSubmenu = (label: string) => {
    if (expandedSubmenu === label) {
      setExpandedSubmenu(null);
    } else {
      setExpandedSubmenu(label);
    }
  };
  
  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(`${href}/`);
  };
  
  const handleNavClick = (item: any) => {
    // If it's a direct link with no submenu, close the sidebar on mobile
    if (!item.submenu && isMobile && closeSidebar) {
      closeSidebar();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* App Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary-600 mr-3" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm2-10c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm4 3.43c0 .35-.26.62-.6.62h-.36c-.31 0-.58-.21-.62-.51-.19-1.33-1.14-2.28-2.47-2.47-.3-.04-.51-.31-.51-.62v-.36c0-.34.27-.6.62-.6h.01c2.07.12 3.74 1.79 3.86 3.86.01.01.01.03.01.05 0 .01.06.03.06.03z"/>
          </svg>
          <div>
            <h1 className="text-lg font-bold text-gray-900">HealthApp</h1>
            <p className="text-xs text-gray-500">Annual Wellness Visits</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.label}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    aria-expanded={expandedSubmenu === item.label}
                  >
                    <div className="flex items-center">
                      <span className="mr-3 text-gray-500">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {expandedSubmenu === item.label ? (
                      <FiChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <FiChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  
                  {expandedSubmenu === item.label && (
                    <ul className="mt-1 ml-4 pl-4 border-l border-gray-200 space-y-1">
                      {item.submenu.map((subItem) => (
                        <li key={subItem.label}>
                          <Link
                            href={subItem.href}
                            onClick={() => isMobile && closeSidebar()}
                            className={`group flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                              isActive(subItem.href)
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <span className={`mr-2 ${isActive(subItem.href) ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                              {subItem.icon}
                            </span>
                            <span>{subItem.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`mr-3 ${isActive(item.href) ? 'text-primary-600' : 'text-gray-500'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="flex items-center p-3 mb-4 rounded-lg bg-gray-50">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
            {getUserInitials()}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'User'}</p>
            <Link 
              href="/dashboard/settings/profile" 
              onClick={() => isMobile && closeSidebar()}
              className="text-xs text-gray-500 hover:text-primary-600 transition-colors flex items-center"
            >
              <FiUser className="inline w-3 h-3 mr-1" />
              My Profile
            </Link>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-700 
          hover:bg-gray-100 hover:text-gray-900 transition-colors text-sm"
        >
          <FiLogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
} 