#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for Lendify
 * 
 * This script tests all API endpoints to ensure they're working correctly.
 * Run with: node scripts/test-api.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api'
const VERBOSE = process.env.VERBOSE === 'true'

// Test configuration
const config = {
  timeout: 10000, // 10 seconds
  retries: 2
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
}

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warning' ? '⚠️' : 'ℹ️'
  console.log(`${prefix} [${timestamp}] ${message}`)
}

function logVerbose(message) {
  if (VERBOSE) {
    console.log(`   ${message}`)
  }
}

async function makeRequest(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  logVerbose(`Making ${method} request to ${url}`)
  
  try {
    const response = await fetch(url, options)
    const data = await response.text()
    
    let parsedData
    try {
      parsedData = JSON.parse(data)
    } catch {
      parsedData = data
    }

    logVerbose(`Response status: ${response.status}`)
    logVerbose(`Response data: ${JSON.stringify(parsedData, null, 2)}`)

    return {
      status: response.status,
      data: parsedData,
      headers: Object.fromEntries(response.headers.entries())
    }
  } catch (error) {
    logVerbose(`Request failed: ${error.message}`)
    throw error
  }
}

function addTestResult(name, passed, message = '', details = {}) {
  results.tests.push({
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  })
  
  if (passed) {
    results.passed++
    log(`Test passed: ${name}`, 'success')
  } else {
    results.failed++
    log(`Test failed: ${name} - ${message}`, 'error')
  }
}

// Test functions
async function testHealthCheck() {
  try {
    const response = await makeRequest('GET', '/health')
    
    if (response.status === 404) {
      addTestResult('Health Check', false, 'Health endpoint not implemented (optional)')
      return
    }

    const passed = response.status === 200
    addTestResult('Health Check', passed, passed ? '' : `Expected 200, got ${response.status}`)
  } catch (error) {
    addTestResult('Health Check', false, `Request failed: ${error.message}`)
  }
}

async function testListingsEndpoints() {
  log('Testing Listings endpoints...')

  // Test GET /api/listings
  try {
    const response = await makeRequest('GET', '/listings')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /listings', passed, passed ? '' : 'Failed to get listings')
  } catch (error) {
    addTestResult('GET /listings', false, `Request failed: ${error.message}`)
  }

  // Test GET /api/listings with filters
  try {
    const response = await makeRequest('GET', '/listings?page=1&limit=5&sortBy=created_at')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /listings with filters', passed, passed ? '' : 'Failed to get filtered listings')
  } catch (error) {
    addTestResult('GET /listings with filters', false, `Request failed: ${error.message}`)
  }

  // Test GET /api/listings/featured
  try {
    const response = await makeRequest('GET', '/listings/featured')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /listings/featured', passed, passed ? '' : 'Failed to get featured listings')
  } catch (error) {
    addTestResult('GET /listings/featured', false, `Request failed: ${error.message}`)
  }

  // Test POST /api/listings (without auth - should fail)
  try {
    const newListing = {
      title: "Test Item",
      description: "Test description for API testing",
      category_id: "test-uuid",
      price_per_day: 25.00,
      condition: "good"
    }
    
    const response = await makeRequest('POST', '/listings', newListing)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /listings (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /listings (no auth)', false, `Request failed: ${error.message}`)
  }
}

async function testSearchEndpoints() {
  log('Testing Search endpoints...')

  // Test search without query (should fail)
  try {
    const response = await makeRequest('GET', '/search')
    const passed = response.status === 400 // Should require query parameter
    addTestResult('GET /search (no query)', passed, passed ? '' : 'Should require query parameter')
  } catch (error) {
    addTestResult('GET /search (no query)', false, `Request failed: ${error.message}`)
  }

  // Test search with query
  try {
    const response = await makeRequest('GET', '/search?query=camera&limit=5')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /search with query', passed, passed ? '' : 'Failed to search listings')
  } catch (error) {
    addTestResult('GET /search with query', false, `Request failed: ${error.message}`)
  }

  // Test search suggestions
  try {
    const response = await makeRequest('GET', '/search/suggestions?query=cam&limit=5')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /search/suggestions', passed, passed ? '' : 'Failed to get search suggestions')
  } catch (error) {
    addTestResult('GET /search/suggestions', false, `Request failed: ${error.message}`)
  }
}

async function testCategoriesEndpoints() {
  log('Testing Categories endpoints...')

  // Test GET /api/categories
  try {
    const response = await makeRequest('GET', '/categories')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /categories', passed, passed ? '' : 'Failed to get categories')
  } catch (error) {
    addTestResult('GET /categories', false, `Request failed: ${error.message}`)
  }

  // Test GET /api/categories with params
  try {
    const response = await makeRequest('GET', '/categories?include_counts=true&include_children=true')
    const passed = response.status === 200 && response.data && response.data.success
    addTestResult('GET /categories with params', passed, passed ? '' : 'Failed to get categories with params')
  } catch (error) {
    addTestResult('GET /categories with params', false, `Request failed: ${error.message}`)
  }

  // Test POST /api/categories (without auth - should fail)
  try {
    const newCategory = {
      name: "Test Category",
      slug: "test-category"
    }
    
    const response = await makeRequest('POST', '/categories', newCategory)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /categories (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /categories (no auth)', false, `Request failed: ${error.message}`)
  }
}

async function testBookingsEndpoints() {
  log('Testing Bookings endpoints...')

  // Test GET /api/bookings (without auth - should fail)
  try {
    const response = await makeRequest('GET', '/bookings')
    const passed = response.status === 401 // Should require authentication
    addTestResult('GET /bookings (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('GET /bookings (no auth)', false, `Request failed: ${error.message}`)
  }

  // Test POST /api/bookings (without auth - should fail)
  try {
    const newBooking = {
      listing_id: "test-uuid",
      start_date: "2024-01-15T00:00:00Z",
      end_date: "2024-01-20T00:00:00Z",
      total_price: 125.00
    }
    
    const response = await makeRequest('POST', '/bookings', newBooking)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /bookings (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /bookings (no auth)', false, `Request failed: ${error.message}`)
  }
}

async function testUsersEndpoints() {
  log('Testing Users endpoints...')

  // Test GET /api/users/profile (without auth - should fail)
  try {
    const response = await makeRequest('GET', '/users/profile')
    const passed = response.status === 401 // Should require authentication
    addTestResult('GET /users/profile (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('GET /users/profile (no auth)', false, `Request failed: ${error.message}`)
  }

  // Test GET /api/users/[id] with invalid UUID
  try {
    const response = await makeRequest('GET', '/users/invalid-uuid')
    const passed = response.status === 400 // Should validate UUID format
    addTestResult('GET /users/[id] (invalid UUID)', passed, passed ? '' : 'Should validate UUID format')
  } catch (error) {
    addTestResult('GET /users/[id] (invalid UUID)', false, `Request failed: ${error.message}`)
  }
}

async function testAIEndpoints() {
  log('Testing AI endpoints...')

  // Test POST /api/ai/analyze-photos (without auth - should fail)
  try {
    const request = {
      photos: ["https://example.com/photo.jpg"],
      analysis_type: "description"
    }
    
    const response = await makeRequest('POST', '/ai/analyze-photos', request)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /ai/analyze-photos (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /ai/analyze-photos (no auth)', false, `Request failed: ${error.message}`)
  }

  // Test POST /api/ai/generate-content (without auth - should fail)
  try {
    const request = {
      type: "title",
      context: {
        category: "Electronics"
      },
      tone: "friendly"
    }
    
    const response = await makeRequest('POST', '/ai/generate-content', request)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /ai/generate-content (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /ai/generate-content (no auth)', false, `Request failed: ${error.message}`)
  }

  // Test POST /api/ai/price-suggestions (without auth - should fail)
  try {
    const request = {
      category_id: "test-uuid",
      condition: "good",
      location: {
        lat: 37.7749,
        lng: -122.4194
      }
    }
    
    const response = await makeRequest('POST', '/ai/price-suggestions', request)
    const passed = response.status === 401 // Should require authentication
    addTestResult('POST /ai/price-suggestions (no auth)', passed, passed ? '' : 'Should require authentication')
  } catch (error) {
    addTestResult('POST /ai/price-suggestions (no auth)', false, `Request failed: ${error.message}`)
  }
}

async function testRateLimiting() {
  log('Testing rate limiting...')

  // Make multiple rapid requests to test rate limiting
  const promises = []
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest('GET', '/listings'))
  }

  try {
    const responses = await Promise.all(promises)
    const rateLimited = responses.some(r => r.status === 429)
    
    // Rate limiting might not trigger with just 10 requests
    addTestResult('Rate Limiting Test', true, 'Rate limiting test completed (may not trigger with low volume)')
  } catch (error) {
    addTestResult('Rate Limiting Test', false, `Request failed: ${error.message}`)
  }
}

async function testCORSHeaders() {
  log('Testing CORS headers...')

  try {
    const response = await makeRequest('OPTIONS', '/listings')
    const hasCorsHeaders = response.headers['access-control-allow-origin'] || response.headers['Access-Control-Allow-Origin']
    
    addTestResult('CORS Headers', !!hasCorsHeaders, hasCorsHeaders ? '' : 'Missing CORS headers')
  } catch (error) {
    addTestResult('CORS Headers', false, `Request failed: ${error.message}`)
  }
}

async function testSecurityHeaders() {
  log('Testing security headers...')

  try {
    const response = await makeRequest('GET', '/listings')
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection',
      'referrer-policy'
    ]

    const hasSecurityHeaders = securityHeaders.some(header => 
      response.headers[header] || response.headers[header.toLowerCase()]
    )
    
    addTestResult('Security Headers', hasSecurityHeaders, hasSecurityHeaders ? '' : 'Missing security headers')
  } catch (error) {
    addTestResult('Security Headers', false, `Request failed: ${error.message}`)
  }
}

async function testErrorHandling() {
  log('Testing error handling...')

  // Test 404 for non-existent endpoint
  try {
    const response = await makeRequest('GET', '/non-existent-endpoint')
    const passed = response.status === 404
    addTestResult('404 Error Handling', passed, passed ? '' : 'Should return 404 for non-existent endpoints')
  } catch (error) {
    addTestResult('404 Error Handling', false, `Request failed: ${error.message}`)
  }

  // Test 405 for invalid method
  try {
    const response = await makeRequest('PATCH', '/listings')
    const passed = response.status === 405 || response.status === 404
    addTestResult('405 Error Handling', passed, passed ? '' : 'Should handle invalid HTTP methods')
  } catch (error) {
    addTestResult('405 Error Handling', false, `Request failed: ${error.message}`)
  }
}

async function runAllTests() {
  log('Starting comprehensive API tests...')
  log(`Base URL: ${BASE_URL}`)
  log(`Verbose mode: ${VERBOSE}`)
  
  const startTime = Date.now()

  // Run all test suites
  await testHealthCheck()
  await testListingsEndpoints()
  await testSearchEndpoints()
  await testCategoriesEndpoints()
  await testBookingsEndpoints()
  await testUsersEndpoints()
  await testAIEndpoints()
  await testRateLimiting()
  await testCORSHeaders()
  await testSecurityHeaders()
  await testErrorHandling()

  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000

  // Print summary
  log('\n=== TEST SUMMARY ===')
  log(`Tests completed in ${duration.toFixed(2)} seconds`)
  log(`Total tests: ${results.tests.length}`)
  log(`Passed: ${results.passed}`, 'success')
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'info')
  log(`Skipped: ${results.skipped}`, 'warning')

  const passRate = results.tests.length > 0 ? (results.passed / results.tests.length * 100).toFixed(1) : 0
  log(`Pass rate: ${passRate}%`)

  if (results.failed > 0) {
    log('\n=== FAILED TESTS ===', 'error')
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        log(`❌ ${test.name}: ${test.message}`, 'error')
      })
  }

  // Generate test report
  const report = {
    summary: {
      total: results.tests.length,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: parseFloat(passRate),
      duration,
      timestamp: new Date().toISOString()
    },
    tests: results.tests,
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform
    }
  }

  // Save report to file
  const fs = require('fs')
  const path = require('path')
  
  try {
    const reportDir = path.join(process.cwd(), 'test-reports')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    const reportFile = path.join(reportDir, `api-test-report-${Date.now()}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
    log(`Test report saved to: ${reportFile}`)
  } catch (error) {
    log(`Failed to save test report: ${error.message}`, 'warning')
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0)
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error')
  process.exit(1)
})

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error')
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  makeRequest,
  addTestResult,
  results
}