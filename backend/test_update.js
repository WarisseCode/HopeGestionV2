const dotenv = require('dotenv');
dotenv.config();

// Simulate the exact same request the frontend sends
async function testUpdate() {
  const API_URL = process.env.RENDER_API_URL || 'http://localhost:5000';
  
  // First, let's login to get a token
  console.log('=== Testing owner update locally ===');
  console.log('API:', API_URL);
  
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.TEST_EMAIL || 'admin@hopegestion.com', password: process.env.TEST_PASSWORD || 'Admin123!' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Login OK, token obtained');
  
  // Now test the update with a small fake photo_url (base64)
  const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const updatePayload = {
    name: 'Test',
    type: 'individual',
    phone: '+22997111111',
    email: 'test@test.com',
    management_mode: 'direct',
    photo_url: fakeBase64
  };
  
  console.log('\nSending PUT /api/compte/proprietaires/10 with payload keys:', Object.keys(updatePayload));
  
  const updateRes = await fetch(`${API_URL}/api/compte/proprietaires/10`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(updatePayload)
  });
  
  console.log('Response status:', updateRes.status);
  const responseBody = await updateRes.text();
  console.log('Response body:', responseBody.substring(0, 500));
}

testUpdate().catch(e => console.error('Test error:', e));
