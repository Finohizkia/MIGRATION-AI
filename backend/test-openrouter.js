require('dotenv').config();
const axios = require('axios');

async function testOpenRouter() {
  console.log('🧪 Testing OpenRouter API...\n');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('- OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || '❌ NOT SET');
  console.log('- OPENAI_KEY:', process.env.OPENAI_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('- MODEL_NAME:', process.env.MODEL_NAME || '❌ NOT SET');
  console.log('');

  if (!process.env.OPENAI_KEY) {
    console.error('❌ OPENAI_KEY not found in environment variables');
    return;
  }

  try {
    // Test 1: Basic API connectivity
    console.log('Test 1: Basic API Request');
    const response = await axios.post(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      model: process.env.MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: 'Say hello!'
        }
      ],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ API Response received');
    console.log('Response:', response.data.choices[0]?.message?.content);
    console.log('Model used:', response.data.model);
    console.log('Usage:', response.data.usage);
    console.log('');

    // Test 2: Immigration-specific query (like your app)
    console.log('Test 2: Immigration Query (like your app)');
    const immigrationResponse = await axios.post(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      model: process.env.MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: 'You are an immigration assistant. Provide accurate information about visas, immigration processes, and related topics.'
        },
        {
          role: 'user',
          content: 'What documents do I need for a tourist visa to Australia?'
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Immigration query successful');
    console.log('Response:', immigrationResponse.data.choices[0]?.message?.content);
    console.log('');

  } catch (error) {
    console.error('❌ API Test Failed');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Message:', error.message);
    console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Request URL:', error.config?.url);
    console.error('Request Headers:', error.config?.headers);
  }
}

// Run the test
testOpenRouter();