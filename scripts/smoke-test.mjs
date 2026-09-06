import assert from "node:assert/strict";
import { fixtureSecrets, readJson, startProductionServer, stopProductionServer } from "./http-test-utils.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const protectedRoutes = [
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

let server;
let checks = 0;
let failure;

try {
  server = await startProductionServer();
  const home = await fetch(server.baseUrl);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /ConnectAble/i);
  checks += 1;

  const demo = await fetch(`${server.baseUrl}/demo/mentor`);
  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /One job: help people get to work/);
  checks += 1;
  for (const route of ['/app/mentor', '/app/commutes', '/app/support', `/app/mentor/mentees/${id}`]) {
    const response = await fetch(`${server.baseUrl}${route}`, {redirect:'manual'});
    assert.equal(response.status, 307);
    assert.match(response.headers.get('location'), /\/login/);
    checks += 1;
  }

  const health = await fetch(`${server.baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await readJson(health), { status: "ok", service: "connectable", phases: [0, 2] });
  checks += 1;

  for (const [method, route] of protectedRoutes) {
    const response = await fetch(`${server.baseUrl}${route}`, {
      method,
      headers: method === "GET" ? undefined : { "content-type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    assert.equal(response.status, 401, `${method} ${route} should reject an unauthenticated request`);
    const body = await readJson(response);
    assert.equal(typeof body.error, "string", `${method} ${route} should return a structured error`);
    checks += 1;
  }

  const invalidInvite = await fetch(`${server.baseUrl}/api/admin/coaches/invite`, {
    method: "POST",
    headers: { authorization: `Bearer ${fixtureSecrets.admin}`, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(invalidInvite.status, 400);
  assert.equal((await readJson(invalidInvite)).error, "validation_error");
  checks += 1;

  const invalidWebhook = await fetch(`${server.baseUrl}/api/webhooks/ghl`, {
    method: "POST",
    headers: { "x-webhook-secret": fixtureSecrets.webhook, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(invalidWebhook.status, 400);
  assert.equal((await readJson(invalidWebhook)).error, "validation_error");
  checks += 1;

  const missing = await fetch(`${server.baseUrl}/api/does-not-exist`);
  assert.equal(missing.status, 404);
  checks += 1;

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
  console.log(`Smoke test passed: ${checks} production HTTP checks for public pages, mentor/support guards and Phase 0/2 API guards.`);
}
