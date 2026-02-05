/**
 * Simple Load Test - Public Endpoints Only
 *
 * Use this for quick performance checks without authentication.
 *
 * Usage:
 *   k6 run scripts/load-test-simple.js
 *   k6 run -e VUS=50 -e DURATION=60s scripts/load-test-simple.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://www.sumi.you';
const VUS = parseInt(__ENV.VUS) || 10;
const DURATION = __ENV.DURATION || '30s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1 second
    http_req_failed: ['rate<0.05'],    // Less than 5% failures
  },
};

export default function () {
  // Test 1: Homepage (cached by CDN)
  const homepage = http.get(`${BASE_URL}/`);
  check(homepage, { 'homepage OK': (r) => r.status === 200 });

  sleep(0.5);

  // Test 2: Styles API
  const styles = http.get(`${BASE_URL}/api/styles`);
  check(styles, {
    'styles OK': (r) => r.status === 200,
    'styles fast': (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // Test 3: Layouts API
  const layouts = http.get(`${BASE_URL}/api/layouts`);
  check(layouts, {
    'layouts OK': (r) => r.status === 200,
    'layouts fast': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
