const http = require('http');

console.log('🧪 Starting Sentinel API Gateway - Restaurant Service Integration Test...');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    let bodyStr = '';
    if (postData) {
      bodyStr = JSON.stringify(postData);
      options.headers = options.headers || {};
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', (e) => { reject(e); });
    if (postData) {
      req.write(bodyStr);
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
    const menuJson = JSON.parse(resMenu.body);
    console.log(`Status: ${resMenu.statusCode}, Restaurant: ${menuJson.restaurant}`);

    // Test 2: Get Tables
    console.log('\n--- Test 2: GET /restaurant/tables ---');
    const resTables = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/tables',
      method: 'GET'
    });
    const tablesJson = JSON.parse(resTables.body);
    console.log(`Status: ${resTables.statusCode}, Count: ${tablesJson.tables.length}`);

    // Test 3: Create Booking
    console.log('\n--- Test 3: POST /restaurant/bookings ---');
    const resBooking = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/bookings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { tableId: 't3', customerName: 'Rishu Ray', partySize: 4, time: '20:00' });
    const bookingJson = JSON.parse(resBooking.body);
    console.log(`Status: ${resBooking.statusCode}, Message: ${bookingJson.message}`);

    // Test 4: Place Order
    console.log('\n--- Test 4: POST /restaurant/orders ---');
    const orderData = {
      tableId: 't3',
      items: [
        { id: 'm1', name: 'Butter Chicken', price: 14.99, quantity: 2 },
        { id: 'dr1', name: 'Mango Lassi', price: 3.49, quantity: 4 }
      ]
    };
    const resOrder = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, orderData);
    console.log(`Status: ${resOrder.statusCode}`);
    const orderJson = JSON.parse(resOrder.body);
    console.log(`Total: $${orderJson.order.total}, Status: ${orderJson.order.status}`);
    if (orderJson.order.total !== 43.94) {
      throw new Error(`Expected total 43.94, got ${orderJson.order.total}`);
    }
    console.log('✅ Order placement passed.');

    // Test 5: Post Review
    console.log('\n--- Test 5: POST /restaurant/reviews ---');
    const reviewData = {
      author: 'John Doe',
      rating: 5,
      comment: 'Superb food and prompt delivery!'
    };
    const resReview = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/reviews',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, reviewData);
    console.log(`Status: ${resReview.statusCode}`);
    const reviewJson = JSON.parse(resReview.body);
    console.log(`Author: ${reviewJson.review.author}, Rating: ${reviewJson.review.rating}`);
    console.log('✅ Review submission passed.');

    // Test 6: Get Reviews (with Average Rating check)
    console.log('\n--- Test 6: GET /restaurant/reviews (Check Stats) ---');
    const resReviewsList = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/restaurant/reviews',
      method: 'GET'
    });
    console.log(`Status: ${resReviewsList.statusCode}`);
    const reviewsListJson = JSON.parse(resReviewsList.body);
    console.log(`Total Reviews: ${reviewsListJson.totalReviews}, Avg Rating: ${reviewsListJson.avgRating}`);
    if (reviewsListJson.totalReviews < 3) {
      throw new Error('Expected at least 3 reviews');
    }
    console.log('✅ Reviews statistics verified.');

    console.log('\n🎉 All Integration Tests Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Integration Test Failed:', error.message);
    process.exit(1);
  }
}

runTests();
