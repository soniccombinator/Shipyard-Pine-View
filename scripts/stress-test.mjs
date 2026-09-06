import { performance } from "node:perf_hooks";
import { percentile, startProductionServer, stopProductionServer } from "./http-test-utils.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const guardedTargets = [
  ["POST", "/api/admin/reseed"],
  ["GET", "/api/admin/metrics"],
  ["POST", "/api/admin/coaches/invite"],
  ["GET", "/api/coach/participants"],
  ["GET", `/api/coach/participants/${id}`],
  ["POST", `/api/coach/participants/${id}/abilities`],
  ["POST", `/api/coach/participants/${id}/endorsements`],
  ["POST", `/api/coach/participants/${id}/check-ins`],
  ["GET", "/api/coach/ability-reviews"],
  ["PATCH", `/api/coach/ability-reviews/${id}`],
  ["GET", "/api/moderation/queue"],
  ["PATCH", `/api/moderation/evidence/${id}`],
  ["PATCH", `/api/moderation/captions/${id}`],
  ["POST", "/api/cron/drain"],
  ["POST", "/api/webhooks/ghl"],
];

async function runLoad({ name, baseUrl, total, concurrency, requestFor }) {
  let cursor = 0;
  let failures = 0;
  const latencies = [];
  const started = performance.now();

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= total) return;
      const request = requestFor(index);
      const before = performance.now();
      try {
        const response = await fetch(`${baseUrl}${request.path}`, {
          method: request.method,
          headers: request.method === "GET" ? undefined : { "content-type": "application/json" },
          body: request.method === "GET" ? undefined : "{}",
          signal: AbortSignal.timeout(5_000),
        });
        await response.arrayBuffer();
        if (response.status !== request.expectedStatus) failures += 1;
      } catch {
        failures += 1;
      } finally {
        latencies.push(performance.now() - before);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsedMs = performance.now() - started;
  const summary = {
    name,
    requests: total,
    concurrency,
    failures,
    requestsPerSecond: Number((total / (elapsedMs / 1000)).toFixed(1)),
    p50Ms: Number(percentile(latencies, 0.5).toFixed(1)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(1)),
    p99Ms: Number(percentile(latencies, 0.99).toFixed(1)),
    maxMs: Number(Math.max(...latencies).toFixed(1)),
  };
  console.log(JSON.stringify(summary));
  if (failures > 0) throw new Error(`${name} had ${failures} failed requests.`);
  if (summary.p99Ms > 2_000) throw new Error(`${name} exceeded the 2000 ms p99 latency limit.`);
  return summary;
}

let server;
let failure;
try {
  server = await startProductionServer();
  await runLoad({
    name: "health",
    baseUrl: server.baseUrl,
    total: 3_000,
    concurrency: 100,
    requestFor: () => ({ method: "GET", path: "/api/health", expectedStatus: 200 }),
  });
  await runLoad({
    name: "all-authentication-guards",
    baseUrl: server.baseUrl,
    total: 3_000,
    concurrency: 75,
    requestFor: (index) => {
      const [method, path] = guardedTargets[index % guardedTargets.length];
      return { method, path, expectedStatus: 401 };
    },
  });
} catch (error) {
  failure = error;
} finally {
  if (server) {
    try {
      await stopProductionServer(server);
    } catch (error) {
      failure ??= error;
    }
  }
}

if (failure) {
  console.error(failure);
  process.exitCode = 1;
} else {
  console.log("Stress test passed: 6,000 requests with zero status or transport failures.");
}
