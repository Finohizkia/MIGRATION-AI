import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function testGeminiWithVPN() {
  try {
    console.log('🧪 Testing Gemini API with VPN...');
    
    // Check if API key is set
    if (!process.env.GOOGLE_API_KEY) {
      console.log('❌ GOOGLE_API_KEY not found in environment variables');
      console.log('💡 Make sure to add your Gemini API key to the .env file');
      return;
    }

    console.log('✅ API Key found:', process.env.GOOGLE_API_KEY.substring(0, 10) + '...');
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.3
      }
    });

    console.log('🌐 Making test request to Gemini API...');
    
    const result = await model.generateContent("Hello! Please respond with 'Gemini is working!' if you can see this.");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Success!');
    console.log('Response:', text);
    console.log('✅ Your VPN is working correctly with Gemini!');

  } catch (error) {
    console.log('❌ Gemini API Error:');
    console.log('Error message:', error.message);
    
    if (error.message.includes('429')) {
      console.log('🔁 Rate limit exceeded - try again in a moment');
    } else if (error.message.includes('403')) {
      console.log('🔐 Permission denied - check your API key or region restrictions');
      console.log('🌐 Make sure your VPN is connected to a supported region');
    } else if (error.message.includes('500')) {
      console.log('🔧 Internal server error - try again');
    } else {
      console.log('🔍 Full error details:', error);
    }
  }
}

// Run the test
testGeminiWithVPN();