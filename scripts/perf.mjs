// Measures dashboard API latency against the seeded database.
//   npm run build && npm start   (in another terminal; RATE_LIMIT_DISABLED=true to skip the login limiter)
//   node scripts/perf.mjs [baseUrl]
const base = process.argv[2] ?? "http://localhost:3000";
const RUNS = 15;

const jar = {};
const store = (r) =>
  r.headers.getSetCookie().forEach((c) => {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jar[kv.slice(0, i)] = kv.slice(i + 1);
  });
const cookie = () =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

store(
  await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: new URL(base).origin },
    body: JSON.stringify({ email: "viewer@coffee.test", password: "Password123" }),
  }),
);

async function time(path) {
  const t = performance.now();
  const res = await fetch(base + path, { headers: { cookie: cookie() } });
  const body = await res.arrayBuffer();
  return { ms: performance.now() - t, status: res.status, bytes: body.byteLength };
}
const pct = (arr, p) =>
  [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil((p / 100) * arr.length) - 1)];

const first = await (
  await fetch(`${base}/api/admin/orders?pageSize=1`, { headers: { cookie: cookie() } })
).json();
console.log(`orders in database: ${first.total.toLocaleString("en-US")}\n`);

const today = new Date().toISOString().slice(0, 10);
const range = `from=${today.slice(0, 4)}-01-01&to=${today}`;
const cases = [
  ["orders: first page", "/api/admin/orders?pageSize=25"],
  ["orders: sort by total desc", "/api/admin/orders?sort=totalCents:desc"],
  ["orders: sort by customer", "/api/admin/orders?sort=customer:asc"],
  [
    "orders: status + date filter",
    "/api/admin/orders?status=DELIVERED,SHIPPED&from=2026-03-01&to=2026-08-31",
  ],
  ["orders: search by name", "/api/admin/orders?q=smith&sort=createdAt:desc"],
  ["orders: deep page (page 500)", "/api/admin/orders?page=500&pageSize=100"],
  ["orders: drill-down by category", "/api/admin/orders?category=single-origin&from=2026-01-01"],
  ["analytics: summary", `/api/admin/analytics/summary?${range}`],
  ["analytics: timeseries (+prev period)", `/api/admin/analytics/timeseries?${range}`],
  ["analytics: top products", `/api/admin/analytics/top-products?${range}`],
  ["analytics: by category", `/api/admin/analytics/categories?${range}`],
  ["analytics: status distribution", `/api/admin/analytics/statuses?${range}`],
  ["orders: payment status + method", "/api/admin/orders?paymentStatus=UNPAID&paymentMethod=COD"],
  ["analytics: conversion funnel", `/api/admin/analytics/funnel?${range}`],
  ["analytics: by governorate", `/api/admin/analytics/governorates?${range}`],
  ["analytics: payment methods", `/api/admin/analytics/payment-methods?${range}`],
  ["analytics: abandoned carts", `/api/admin/analytics/abandoned-carts?${range}`],
  ["customers: by spend", "/api/admin/customers?pageSize=25"],
];

console.log(
  "endpoint".padEnd(40),
  "median".padStart(8),
  "p95".padStart(8),
  "max".padStart(8),
  "  size",
);
for (const [label, path] of cases) {
  await time(path); // warm-up (connection, query plan)
  const runs = [];
  let last;
  for (let i = 0; i < RUNS; i++) {
    last = await time(path);
    if (last.status !== 200) throw new Error(`${label}: HTTP ${last.status}`);
    runs.push(last.ms);
  }
  console.log(
    label.padEnd(40),
    `${pct(runs, 50).toFixed(0)}ms`.padStart(8),
    `${pct(runs, 95).toFixed(0)}ms`.padStart(8),
    `${Math.max(...runs).toFixed(0)}ms`.padStart(8),
    `  ${(last.bytes / 1024).toFixed(0)}KB`,
  );
}

// full CSV export (streams every row)
const t = performance.now();
const csv = await fetch(`${base}/api/admin/export/orders`, { headers: { cookie: cookie() } });
const buf = await csv.arrayBuffer();
const rows = new TextDecoder().decode(buf).trim().split("\r\n").length - 1;
console.log(
  `\nCSV export, all rows: ${rows.toLocaleString("en-US")} rows, ${(buf.byteLength / 1048576).toFixed(1)}MB in ${((performance.now() - t) / 1000).toFixed(2)}s`,
);
