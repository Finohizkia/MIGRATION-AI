import axios from 'axios';

async function testConnection() {
  try {
    console.log('Testing connection to backend...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5502/api/health');
    console.log('Health check:', healthResponse.data);
    
    // Test registration
    const registerResponse = await axios.post('http://localhost:5502/api/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Registration test:', registerResponse.data);
    
    console.log('✅ All tests passed! Connection is working correctly.');
  } catch (error) {
    console.error('❌ Connection test failed:', error.response?.data || error.message);
  }
}

testConnection();