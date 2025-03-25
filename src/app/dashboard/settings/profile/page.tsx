'use client';

import { useState, useEffect } from 'react';
import { FiUser, FiSave, FiLock, FiShield, FiMail, FiFileText } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import userService, { IUserProfile } from '@/services/userService';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<IUserProfile | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  
  // Load user profile when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Get user role
        const { role } = await userService.getUserRole(user.uid);
        setUserRole(role);
        
        // Get user profile
        const userData = await userService.getUserProfile();
        setProfile(userData);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (profile) {
      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        
        if (name.startsWith('notification.')) {
          const notificationKey = name.split('.')[1] as 'email' | 'inApp';
          setProfile({
            ...profile,
            notificationPreferences: {
              ...profile.notificationPreferences,
              [notificationKey]: checked,
            },
          });
        } else if (name === 'twoFactorEnabled') {
          setProfile({
            ...profile,
            twoFactorEnabled: checked,
          });
        }
      } else {
        setProfile({
          ...profile,
          [name]: value,
        });
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      await userService.updateUserProfile(profile);
      
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-xl p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information and preferences</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          <p>{successMessage}</p>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 sm:px-6 flex border-b border-gray-100">
          <button
            className={`py-4 px-2 text-sm font-medium border-b-2 ${
              activeTab === 'personal'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('personal')}
          >
            <div className="flex items-center">
              <FiUser className="mr-2 h-4 w-4" />
              <span>Personal Information</span>
            </div>
          </button>
          <button
            className={`ml-8 py-4 px-2 text-sm font-medium border-b-2 ${
              activeTab === 'security'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('security')}
          >
            <div className="flex items-center">
              <FiShield className="mr-2 h-4 w-4" />
              <span>Security</span>
            </div>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {activeTab === 'personal' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl mr-4">
                    {profile?.firstName.charAt(0)}{profile?.lastName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {profile?.firstName} {profile?.lastName}
                    </h2>
                    <div className="text-sm text-gray-500 flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {userRole}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profile?.firstName || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profile?.lastName || ''}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="flex">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profile?.email || ''}
                        onChange={handleChange}
                        className="form-input pl-10"
                        disabled // Email changes typically require verification
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={profile?.phone || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Professional Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={profile?.title || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty
                  </label>
                  <input
                    type="text"
                    id="specialty"
                    name="specialty"
                    value={profile?.specialty || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                
                {(userRole === 'provider' || userRole === 'admin') && (
                  <div>
                    <label htmlFor="npi" className="block text-sm font-medium text-gray-700 mb-1">
                      NPI Number
                    </label>
                    <div className="flex">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiFileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="npi"
                          name="npi"
                          value={profile?.npi || ''}
                          onChange={handleChange}
                          className="form-input pl-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="md:col-span-2">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Notification Preferences</h3>
                  <div className="space-y-2 mt-2">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="notification.email"
                          name="notification.email"
                          type="checkbox"
                          checked={profile?.notificationPreferences.email || false}
                          onChange={handleChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="notification.email" className="font-medium text-gray-700">
                          Email Notifications
                        </label>
                        <p className="text-gray-500">
                          Receive email notifications for appointment reminders and system updates
                        </p>
                      </div>
                    </div>
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="notification.inApp"
                          name="notification.inApp"
                          type="checkbox"
                          checked={profile?.notificationPreferences.inApp || false}
                          onChange={handleChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="notification.inApp" className="font-medium text-gray-700">
                          In-App Notifications
                        </label>
                        <p className="text-gray-500">
                          Receive notifications within the application for important events
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          id="currentPassword"
                          className="form-input pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          className="form-input"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          className="form-input"
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        className="btn-secondary"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                  <div className="mt-2">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="twoFactorEnabled"
                          name="twoFactorEnabled"
                          type="checkbox"
                          checked={profile?.twoFactorEnabled || false}
                          onChange={handleChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="twoFactorEnabled" className="font-medium text-gray-700">
                          Enable Two-Factor Authentication
                        </label>
                        <p className="text-gray-500">
                          Add an extra layer of security to your account by requiring a verification code in addition to your password.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              <FiSave className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 