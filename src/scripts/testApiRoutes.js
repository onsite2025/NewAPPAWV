require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

// Base URL for API calls
const API_BASE_URL = 'http://localhost:3000/api';

// Test function for templates API
async function testTemplatesApi() {
  console.log('Testing Templates API...');
  
  try {
    // GET all templates
    console.log('GET /api/templates');
    const response = await axios.get(`${API_BASE_URL}/templates`);
    console.log('Status:', response.status);
    console.log('Found templates:', response.data.length);
    
    if (response.data.length > 0) {
      const template = response.data[0];
      console.log('First template:', {
        id: template._id,
        name: template.name,
        sections: template.sections.length
      });
      
      // GET a specific template
      console.log(`\nGET /api/templates/${template._id}`);
      const templateResponse = await axios.get(`${API_BASE_URL}/templates/${template._id}`);
      console.log('Status:', templateResponse.status);
      console.log('Template name:', templateResponse.data.name);
    }
    
    console.log('\nTemplates API test completed successfully!');
  } catch (error) {
    console.error('Error testing templates API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test function for patients API
async function testPatientsApi() {
  console.log('\nTesting Patients API...');
  
  try {
    // GET all patients
    console.log('GET /api/patients');
    const response = await axios.get(`${API_BASE_URL}/patients`);
    console.log('Status:', response.status);
    console.log('Pagination:', response.data.pagination);
    console.log('Found patients:', response.data.patients.length);
    
    // Create a test patient
    console.log('\nPOST /api/patients');
    const patientData = {
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: '1980-01-01',
      gender: 'male',
      email: 'test.patient@example.com',
      phoneNumber: '555-123-4567'
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/patients`, patientData);
    console.log('Status:', createResponse.status);
    console.log('Created patient:', {
      id: createResponse.data._id,
      name: `${createResponse.data.firstName} ${createResponse.data.lastName}`
    });
    
    // GET the created patient
    const patientId = createResponse.data._id;
    console.log(`\nGET /api/patients/${patientId}`);
    const patientResponse = await axios.get(`${API_BASE_URL}/patients/${patientId}`);
    console.log('Status:', patientResponse.status);
    console.log('Patient:', {
      id: patientResponse.data._id,
      name: `${patientResponse.data.firstName} ${patientResponse.data.lastName}`
    });
    
    console.log('\nPatients API test completed successfully!');
  } catch (error) {
    console.error('Error testing patients API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Main function to run all tests
async function runTests() {
  console.log('Starting API tests...\n');
  
  await testTemplatesApi();
  await testPatientsApi();
  
  console.log('\nAll API tests completed!');
}

runTests(); 