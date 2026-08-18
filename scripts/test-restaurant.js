const http = require('http');

console.log('🧪 Starting Sentinel API Gateway - Restaurant Service Integration Test...');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', (e) => { reject(e); });
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Get Menu
    console.log('\n--- Test 1: GET /restaurant/menu ---');
    const resMenu = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/menu',
      method: 'GET'
    });
    console.log(`Status: ${resMenu.statusCode}`);
    const menuJson = JSON.parse(resMenu.body);
    console.log(`Restaurant: ${menuJson.restaurant}`);
    if (menuJson.restaurant !== 'Flavors of India') {
      throw new Error('Expected Flavors of India');
    }
    console.log('✅ Menu retrieval passed.');

    // Test 2: Get Tables
    console.log('\n--- Test 2: GET /restaurant/tables ---');
    const resTables = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/tables',
      method: 'GET'
    });
    console.log(`Status: ${resTables.statusCode}`);
    const tablesJson = JSON.parse(resTables.body);
    console.log(`Available Tables Count: ${tablesJson.tables.length}`);
    if (tablesJson.tables.length !== 5) {
      throw new Error('Expected 5 tables');
    }
    console.log('✅ Tables retrieval passed.');

    // Test 3: Create Booking
    console.log('\n--- Test 3: POST /restaurant/bookings ---');
    const bookingData = {
      tableId: 't3',
      customerName: 'Rishu Ray',
      partySize: 4,
      time: '20:00'
    };
    const resBooking = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, bookingData);
    console.log(`Status: ${resBooking.statusCode}`);
    const bookingJson = JSON.parse(resBooking.body);
    console.log(`Message: ${bookingJson.message}`);
    if (bookingJson.booking.customerName !== 'Rishu Ray') {
      throw new Error('Expected booking name to be Rishu Ray');
    }
    console.log('✅ Booking creation passed.');

    console.log('\n🎉 Step 18 Tests Completed Successfully!');
  } catch (error) {
    console.error('❌ Integration Test Failed:', error.message);
    process.exit(1);
  }
}

runTests();
