/**
 * Sumi Load Test Script (k6)
 *
 * Install k6: brew install k6
 *
 * Usage:
 *   # Test public endpoints only
 *   k6 run scripts/load-test.js
 *
 *   # Test with authentication (get token from browser cookies)
 *   k6 run -e SESSION_TOKEN="your-session-token" scripts/load-test.js
 *
 *   # Custom target URL
 *   k6 run -e BASE_URL="http://localhost:3000" scripts/load-test.js
 *
 *   # Higher load
 *   k6 run -e MAX_VUS=50 -e DURATION="5m" scripts/load-test.js
 *
 * To get your session token:
 *   1. Log into www.sumi.you
 *   2. Open DevTools → Application → Cookies
 *   3. Copy value of "authjs.session-token" or "__Secure-authjs.session-token"
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://www.sumi.you';
const SESSION_TOKEN = __ENV.SESSION_TOKEN || '';
const MAX_VUS = parseInt(__ENV.MAX_VUS) || 20;
const DURATION = __ENV.DURATION || '2m';

export const options = {
  stages: [
    { duration: '30s', target: Math.floor(MAX_VUS / 2) },  // Ramp up
    { duration: DURATION, target: MAX_VUS },               // Hold at peak
    { duration: '30s', target: 0 },                        // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    errors: ['rate<0.1'],                // Error rate under 10%
  },
};

// Headers for authenticated requests
function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (SESSION_TOKEN) {
    headers['X-Session-Token'] = SESSION_TOKEN;
  }
  return headers;
}

// Test scenarios
export default function () {
  // Randomly choose a scenario
  const scenario = Math.random();

  if (scenario < 0.4) {
    browseHomepage();
  } else if (scenario < 0.7) {
    browseStyles();
  } else if (SESSION_TOKEN) {
    generateInfographic();
  } else {
    browseStyles(); // Fallback if no auth
  }

  sleep(Math.random() * 2 + 1); // 1-3 second think time
}

// Scenario 1: Browse homepage and gallery
function browseHomepage() {
  group('Browse Homepage', () => {
    const res = http.get(`${BASE_URL}/`);

    const success = check(res, {
      'homepage status 200': (r) => r.status === 200,
      'homepage has content': (r) => r.body && r.body.length > 1000,
    });

    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
  });
}

// Scenario 2: Browse styles catalog
function browseStyles() {
  group('Browse Styles', () => {
    // Fetch styles list
    const stylesRes = http.get(`${BASE_URL}/api/styles`);

    const stylesSuccess = check(stylesRes, {
      'styles status 200': (r) => r.status === 200,
      'styles is array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) && data.length > 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!stylesSuccess);
    apiLatency.add(stylesRes.timings.duration);

    sleep(0.5);

    // Fetch layouts list
    const layoutsRes = http.get(`${BASE_URL}/api/layouts`);

    const layoutsSuccess = check(layoutsRes, {
      'layouts status 200': (r) => r.status === 200,
      'layouts is array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data) && data.length > 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!layoutsSuccess);
    apiLatency.add(layoutsRes.timings.duration);
  });
}

// Scenario 3: Full generation flow (requires auth)
function generateInfographic() {
  group('Generate Infographic', () => {
    const topics = [
      'How photosynthesis works',
      'The water cycle explained',
      'History of the internet',
      'How vaccines work',
      'The solar system',
      'Machine learning basics',
      'Coffee production process',
      'How electric cars work',
    ];

    const topic = topics[Math.floor(Math.random() * topics.length)];

    // Step 1: Start generation
    const generateRes = http.post(
      `${BASE_URL}/api/generate`,
      JSON.stringify({ topic }),
      { headers: getAuthHeaders() }
    );

    const generateSuccess = check(generateRes, {
      'generate status 200': (r) => r.status === 200,
      'generate returns job_id': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.job_id && data.job_id.length > 0;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!generateSuccess);
    apiLatency.add(generateRes.timings.duration);

    if (!generateSuccess) {
      console.log(`Generate failed: ${generateRes.status} - ${generateRes.body}`);
      return;
    }

    const jobId = JSON.parse(generateRes.body).job_id;

    // Step 2: Poll for status (simulate realistic polling)
    let attempts = 0;
    const maxAttempts = 5; // Don't poll forever in load test

    while (attempts < maxAttempts) {
      sleep(2); // Poll every 2 seconds

      const statusRes = http.get(
        `${BASE_URL}/api/jobs/${jobId}`,
        { headers: getAuthHeaders() }
      );

      const statusSuccess = check(statusRes, {
        'status check 200': (r) => r.status === 200,
      });

      errorRate.add(!statusSuccess);
      apiLatency.add(statusRes.timings.duration);

      if (!statusSuccess) break;

      try {
        const status = JSON.parse(statusRes.body).status;
        if (status === 'completed' || status === 'failed') {
          break;
        }
      } catch {
        break;
      }

      attempts++;
    }
  });
}

// Summary handler
export function handleSummary(data) {
  const summary = {
    'Total Requests': data.metrics.http_reqs.values.count,
    'Failed Requests': data.metrics.http_req_failed?.values.passes || 0,
    'Avg Response Time': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    'p95 Response Time': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    'Max Response Time': `${data.metrics.http_req_duration.values.max.toFixed(2)}ms`,
    'Requests/sec': data.metrics.http_reqs.values.rate.toFixed(2),
    'Error Rate': `${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%`,
  };

  console.log('\n========== LOAD TEST SUMMARY ==========\n');
  for (const [key, value] of Object.entries(summary)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log('\n========================================\n');

  return {
    'summary.json': JSON.stringify(data, null, 2),
  };
}
