'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSave, FiCamera, FiUpload, FiInfo, FiX } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import practiceService, { IPracticeSettings } from '@/services/practiceService';
import userService from '@/services/userService';

export default function PracticeSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<IPracticeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load practice settings and user role when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get user role
        if (user?.uid) {
          const { role } = await userService.getUserRole(user.uid);
          setUserRole(role);
        }
        
        // Get practice settings
        const practiceData = await practiceService.getPracticeSettings();
        if (practiceData) {
          setSettings(practiceData);
          setLogoPreview(practiceData.logo || null);
        }
      } catch (err) {
        console.error('Error loading practice settings:', err);
        setError('Failed to load practice settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (settings) {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };
  
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Create a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the logo
      const response = await practiceService.uploadLogo(file);
      
      // If successful, update the settings
      if (settings) {
        setSettings({
          ...settings,
          logo: response.url
        });
      }
      
      setSuccessMessage('Logo uploaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleDeleteLogo = async () => {
    if (!settings?.logo) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Delete the logo
      await practiceService.deleteLogo();
      
      // Remove logo from settings and preview
      setLogoPreview(null);
      if (settings) {
        setSettings({
          ...settings,
          logo: null
        });
      }
      
      setSuccessMessage('Logo removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting logo:', err);
      setError('Failed to remove logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings) {
      setError('No settings to save. Please try again.');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      await practiceService.updatePracticeSettings(settings);
      
      setSuccessMessage('Practice settings updated successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating practice settings:', err);
      setError('Failed to update practice settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Check if user can edit settings (admin or provider only)
  const canEdit = userRole === 'admin' || userRole === 'provider';
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(8)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Practice Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your practice information and branding</p>
        </div>
        
        {!canEdit && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm">
            <FiInfo className="inline-block mr-1" /> You can view but not edit practice settings.
          </div>
        )}
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
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">Practice Information</h2>
            <p className="text-sm text-gray-500 mt-1">These details will appear on reports and patient communications</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Practice Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={settings?.name || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={settings?.address || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={settings?.city || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={settings?.state || ''}
                    onChange={handleChange}
                    className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    required
                    disabled={!canEdit || isSaving}
                  />
                </div>
                
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={settings?.zipCode || ''}
                    onChange={handleChange}
                    className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    required
                    disabled={!canEdit || isSaving}
                  />
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
                  value={settings?.phone || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={settings?.email || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  required
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={settings?.website || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <FiInfo className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="ml-3 text-sm">
                    <p className="text-gray-500">The following information is used for billing and reporting purposes only.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={settings?.taxId || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  disabled={!canEdit || isSaving}
                />
              </div>
              
              <div>
                <label htmlFor="npi" className="block text-sm font-medium text-gray-700 mb-1">
                  NPI Number
                </label>
                <input
                  type="text"
                  id="npi"
                  name="npi"
                  value={settings?.npi || ''}
                  onChange={handleChange}
                  className={`form-input ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  disabled={!canEdit || isSaving}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-900">Practice Branding</h2>
            <p className="text-sm text-gray-500 mt-1">Upload your practice logo and customize your branding</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Practice Logo
                </label>
                <div className="flex items-center">
                  <div className="w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg flex items-center justify-center mr-4 overflow-hidden relative">
                    {logoPreview ? (
                      <>
                        <img 
                          src={logoPreview} 
                          alt="Practice Logo" 
                          className="max-w-full max-h-full object-contain"
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={handleDeleteLogo}
                            className="absolute top-1 right-1 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                            disabled={isUploading || isSaving}
                            title="Remove logo"
                          >
                            <FiX className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <FiCamera className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div>
                    {canEdit ? (
                      <>
                        <label 
                          htmlFor="logo-upload" 
                          className={`btn-secondary cursor-pointer flex items-center ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                          <FiUpload className="h-4 w-4" />
                          <span>{isUploading ? 'Uploading...' : 'Upload Logo'}</span>
                          <input
                            id="logo-upload"
                            name="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="sr-only"
                            ref={fileInputRef}
                            disabled={isUploading || isSaving}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Recommended: PNG or JPG, at least 300x300 pixels
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Only administrators and providers can update the practice logo
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || isUploading}
            >
              <FiSave className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}