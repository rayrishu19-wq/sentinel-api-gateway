const http = require('http');

console.log('🧪 Starting Sentinel API Gateway - Restaurant Service Integration Test...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/restaurant/menu',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    console.log(`Correlation ID: ${res.headers['x-request-id'] || 'N/A'}`);
    console.log(`Cache Status: ${res.headers['x-cache'] || 'N/A'}`);
    try {
      const json = JSON.parse(data);
      console.log('Response JSON Preview:', JSON.stringify(json, null, 2).substring(0, 300) + '...');
      if (json.restaurant === 'Flavors of India') {
        console.log('✅ Success! Mock Restaurant is responding correctly through Gateway.');
        process.exit(0);
      } else {
        console.error('❌ Failed: Response did not match expected structure.');
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Failed to parse response JSON:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ HTTP Request Failed (Ensure Gateway & Mock Services are running): ${e.message}`);
  process.exit(1);
});

req.end();
