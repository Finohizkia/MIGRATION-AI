// test-serpapi.js
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function testSerpAPI() {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  
  console.log('🔍 Testing SerpAPI configuration...');
  
  if (!SERPAPI_KEY) {
    console.log('❌ SERPAPI_KEY not found in environment variables');
    console.log('💡 Make sure you have SERPAPI_KEY=your_key in your .env file');
    return;
  }

  console.log('✅ SERPAPI_KEY found:', SERPAPI_KEY.substring(0, 5) + '...');
  console.log('Key length:', SERPAPI_KEY.length);

  try {
    console.log('🌐 Making test request to SerpAPI...');
    
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: 'google',
        q: 'Australia tourist visa requirements',
        api_key: SERPAPI_KEY,
        num: 3,
        hl: 'en'
      },
      timeout: 15000
    });

    console.log('✅ SerpAPI is working!');
    console.log('Status:', response.status);
    console.log('Results found:', response.data.organic_results?.length || 0);
    
    if (response.data.organic_results && response.data.organic_results.length > 0) {
      console.log('\n📄 Sample results:');
      response.data.organic_results.slice(0, 2).forEach((result, i) => {
        console.log(`${i+1}. ${result.title}`);
        console.log(`   ${result.link}`);
        console.log('');
      });
    }

  } catch (error) {
    console.log('❌ SerpAPI Error:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data?.error || 'Unknown error');
      
      if (error.response.data?.error === 'Invalid API key') {
        console.log('🔑 Your API key appears to be invalid or expired');
      } else if (error.response.status === 402) {
        console.log('💳 Payment required - check your SerpAPI account balance');
      } else if (error.response.status === 429) {
        console.log('🚫 Rate limit exceeded - too many requests');
      }
      
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🌐 Network error: Cannot connect to SerpAPI');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ Timeout: SerpAPI took too long to respond');
    } else {
      console.log('Error message:', error.message);
    }
  }
}

// Run the test
testSerpAPI();