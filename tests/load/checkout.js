// Load test for the two paths that matter: shoppers placing cash-on-delivery orders, and staff
// reading the analytics endpoints while that happens.
//
//   RATE_LIMIT_DISABLED=true npm start          (production server; the sign-in limiter would stop the test)
//   k6 run tests/load/checkout.js               (BASE_URL=http://localhost:3000 by default)
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 -e ORIGIN=http://localhost:3000 grafana/k6 run - < tests/load/checkout.js
//
// It writes orders into the database it points at, so use a development or throwaway one.
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
// the sign-in endpoint checks the Origin header against the trusted origins; when k6 reaches the app through a
// different host name (docker: host.docker.internal) pass ORIGIN=http://localhost:3000
const ORIGIN = __ENV.ORIGIN || BASE;
const HEADERS = { "Content-Type": "application/json", Origin: ORIGIN };
const ADDRESS = {
  fullName: "Load Test",
  phone: "01012345678",
  governorate: "C",
  area: "Maadi",
  street: "Road 9",
  building: "12",
};

export const options = {
  scenarios: {
    shoppers: {
      executor: "ramping-vus",
      exec: "shopper",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 10 },
        { duration: "40s", target: 25 },
        { duration: "20s", target: 0 },
      ],
    },
    staff: {
      executor: "constant-vus",
      exec: "staff",
      vus: 3,
      duration: "80s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:browse}": ["p(95)<800"],
    "http_req_duration{kind:checkout}": ["p(95)<2000"],
    "http_req_duration{kind:analytics}": ["p(95)<1200"],
  },
};

function signIn(email) {
  const res = http.post(
    `${BASE}/api/auth/sign-in/email`,
    JSON.stringify({ email, password: "Password123" }),
    {
      headers: HEADERS,
    },
  );
  check(res, { "signed in": (r) => r.status === 200 });
}

export function shopper() {
  group("browse", () => {
    const list = http.get(`${BASE}/api/products?inStock=1&locale=en`, { tags: { kind: "browse" } });
    check(list, { "catalog 200": (r) => r.status === 200 });
    const items = list.json("items") || [];
    if (!items.length) return;
    const pick = items[Math.floor(Math.random() * items.length)];
    const detail = http.get(`${BASE}/api/products/${pick.slug}`, { tags: { kind: "browse" } });
    check(detail, { "product 200": (r) => r.status === 200 });
    const variant = (detail.json("variants") || []).find((v) => v.stock > 5);
    if (!variant) return;

    signIn("customer@coffee.test");
    const order = http.post(
      `${BASE}/api/checkout`,
      JSON.stringify({
        locale: "en",
        paymentMethod: "COD",
        address: ADDRESS,
        items: [{ variantId: variant.id, quantity: 1 }],
      }),
      { headers: HEADERS, tags: { kind: "checkout" } },
    );
    check(order, { "order placed or out of stock": (r) => r.status === 200 || r.status === 409 });
  });
  sleep(1);
}

export function staff() {
  signIn("viewer@coffee.test");
  const range = "from=2026-01-01&to=2026-12-31";
  for (const path of [
    `/api/admin/analytics/summary?${range}`,
    `/api/admin/analytics/timeseries?${range}`,
    `/api/admin/analytics/funnel?${range}`,
    `/api/admin/orders?pageSize=25`,
  ]) {
    const res = http.get(`${BASE}${path}`, { tags: { kind: "analytics" } });
    check(res, { [`${path.split("?")[0]} 200`]: (r) => r.status === 200 });
  }
  sleep(2);
}
