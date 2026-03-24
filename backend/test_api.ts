import * as fs from 'fs';

async function fetchStatus() {
  const token = process.argv[2];
  if (!token) {
      console.log("Usage: npx ts-node check_api.ts <token>");
      return;
  }
  try {
    const response = await fetch('http://localhost:5000/api/subscriptions/status', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error(e);
  }
}
// We can't easily get the live token. Let's do a direct route call internally.
