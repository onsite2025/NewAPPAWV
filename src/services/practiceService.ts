export interface IPracticeSettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  taxId?: string;
  npi?: string;
  logo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const practiceService = {
  // Get practice settings
  getPracticeSettings: async (): Promise<IPracticeSettings> => {
    try {
      console.log('Fetching practice settings');
      const response = await fetch('/api/practice');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch practice settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching practice settings:', error);
      throw error;
    }
  },
  
  // Update practice settings (admin or provider only)
  updatePracticeSettings: async (settingsData: Partial<IPracticeSettings>): Promise<IPracticeSettings> => {
    try {
      console.log('Updating practice settings:', settingsData);
      const response = await fetch('/api/practice', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update practice settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating practice settings:', error);
      throw error;
    }
  },
  
  // Upload practice logo
  uploadLogo: async (file: File): Promise<{ url: string }> => {
    try {
      console.log('Uploading practice logo');
      
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/practice/logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  },
  
  // Delete practice logo
  deleteLogo: async (): Promise<{ success: boolean }> => {
    try {
      console.log('Deleting practice logo');
      const response = await fetch('/api/practice/logo', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete logo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting logo:', error);
      throw error;
    }
  }
};

export default practiceService; 