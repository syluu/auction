// k6 load test: 100 virtual bidders hammering one live auction.
//   k6 run -e AUCTION_ID=6 -e API=http://localhost:4000 load/bids.k6.js
// Requires AUTH_MODE=username_only on the API (each VU logs in as loadN).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const API = __ENV.API || 'http://localhost:4000';
const AUCTION = __ENV.AUCTION_ID || '1';
const accepted = new Counter('bids_accepted');
const rejected = new Counter('bids_rejected');
const bidLatency = new Trend('bid_latency', true);

export const options = {
  scenarios: { bidders: { executor: 'constant-vus', vus: Number(__ENV.VUS || 100), duration: __ENV.DURATION || '60s' } },
  thresholds: { bid_latency: ['p(95)<150'], http_req_failed: ['rate<0.01'] },
};

export function setup() {
  const snap = http.get(`${API}/api/auctions/${AUCTION}`).json();
  return { step: Number(snap.auction.stepPrice) };
}

export default function (data) {
  const jar = http.cookieJar();
  if (!jar.cookiesForURL(API)['auction_session']) {
    http.post(`${API}/api/auth/login`, JSON.stringify({ username: `load${__VU}` }), { headers: { 'Content-Type': 'application/json' } });
  }
  const snap = http.get(`${API}/api/auctions/${AUCTION}`).json().auction;
  const min = snap.currentPrice === null ? Number(snap.startPrice) : Number(snap.currentPrice) + data.step;
  const res = http.post(`${API}/api/auctions/${AUCTION}/bids`, JSON.stringify({ amount: String(min), idempotencyKey: uuid() }), { headers: { 'Content-Type': 'application/json' } });
  bidLatency.add(res.timings.duration);
  if (res.status === 201) accepted.add(1); else rejected.add(1);
  check(res, { 'status is 201/409/429': (r) => [201, 409, 429].includes(r.status) });
  sleep(Math.random() * 1.5 + 0.5);
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16); });
}
