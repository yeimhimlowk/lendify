// Test script to verify rental agreement generation
// This script tests the authentication flow for generating rental agreements

async function testRentalAgreement() {
  console.log('Testing rental agreement generation...\n');
  
  // You'll need to replace these with actual values from your database
  const testBookingId = 'YOUR_BOOKING_ID_HERE'; // Replace with an actual booking ID
  const apiUrl = 'http://localhost:3000/api/agreements/generate';
  
  // You'll need to be logged in to your app and copy the auth cookies
  // from your browser's developer tools (Network tab -> Request Headers -> Cookie)
  const authCookies = 'YOUR_AUTH_COOKIES_HERE'; // Replace with actual cookies
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies
      },
      body: JSON.stringify({
        bookingId: testBookingId,
        customTerms: 'Test custom terms',
        deliveryMethod: 'self-pickup',
        lateFeePerDay: 25
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Success! Rental agreement generated.');
      console.log('Agreement ID:', data.data?.id);
    } else {
      console.log('\n❌ Error:', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Network error:', error.message);
  }
}

// Instructions:
console.log(`
To test the rental agreement generation:

1. Make sure your Next.js app is running (npm run dev)
2. Log in to your app as a user who has a booking
3. Find a booking ID from your database where you are either the owner or renter
4. Copy your authentication cookies from the browser:
   - Open Developer Tools (F12)
   - Go to Network tab
   - Make any authenticated request in your app
   - Look at the Request Headers -> Cookie
   - Copy the entire cookie string
5. Replace YOUR_BOOKING_ID_HERE and YOUR_AUTH_COOKIES_HERE in this script
6. Run: node test-rental-agreement.js
`);

// Uncomment the line below after setting up the test data
// testRentalAgreement();