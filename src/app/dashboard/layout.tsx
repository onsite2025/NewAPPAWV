'use client';

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import { FiMenu, FiX, FiBell, FiSearch } from 'react-icons/fi';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Set sidebar open by default on large screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    // Check on initial render
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    // Add scroll listener
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-300 ease-in-out lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        flex-shrink-0 overflow-y-auto bg-white shadow-lg`}
        aria-label="Sidebar"
      >
        <Navigation isMobile={!isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      </aside>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      
      {/* Main Content Area */}
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        {/* Header */}
        <header 
          className={`sticky top-0 z-30 bg-white transition-shadow ${
            isScrolled ? 'shadow-md' : 'shadow-sm'
          }`}
        >
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 
                focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
                aria-expanded={isSidebarOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">{isSidebarOpen ? 'Close menu' : 'Open menu'}</span>
                {isSidebarOpen ? (
                  <FiX className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <FiMenu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
              <Link href="/dashboard" className="lg:hidden">
                <span className="font-bold text-xl text-primary-600">HealthApp</span>
              </Link>
            </div>
            
            {/* Search (hidden on small screens) */}
            <div className="hidden sm:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 flex-1 max-w-md mx-8">
              <FiSearch className="text-gray-500 mr-2" />
              <input 
                type="text" 
                placeholder="Search patients, visits..." 
                className="bg-transparent text-sm border-none focus:outline-none focus:ring-0 w-full"
                aria-label="Search"
              />
            </div>
            
            {/* Notifications & User Profile */}
            <div className="flex items-center space-x-4">
              <button className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors relative" aria-label="Notifications">
                <FiBell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white"></span>
              </button>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500 mt-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} HealthApp. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
} 