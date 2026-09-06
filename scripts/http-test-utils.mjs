import http from "node:http";
import path from "node:path";
import process from "node:process";

export const fixtureSecrets = {
  admin: "smoke-admin-secret-32-characters-long",
  cron: "smoke-cron-secret-32-characters-long",
  webhook: "smoke-webhook-secret-32-characters-long",
};

export async function startProductionServer() {
  const projectDirectory = path.resolve(import.meta.dirname, "..");
  Object.assign(process.env, {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key-with-sufficient-length",
    SUPABASE_SECRET_KEY: "service-test-key-with-sufficient-length",
    ADMIN_API_SECRET: fixtureSecrets.admin,
    CRON_SECRET: fixtureSecrets.cron,
    GHL_WEBHOOK_SECRET: fixtureSecrets.webhook,
    MODEL_DEGRADED_MODE: "true",
  });
  const { default: next } = await import("next");
  const app = next({ dev: false, dir: projectDirectory, hostname: "127.0.0.1" });
  await app.prepare();
  const handler = app.getRequestHandler();
  const server = http.createServer((request, response) => handler(request, response));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The test server did not expose a TCP port.");
  return { baseUrl: `http://127.0.0.1:${address.port}`, server, app };
}

export async function stopProductionServer(runtime) {
  runtime.server.closeIdleConnections?.();
  await new Promise((resolve, reject) => runtime.server.close((error) => (error ? reject(error) : resolve())));
  await runtime.app.close();
}

export async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${response.url}, received: ${text.slice(0, 200)}`);
  }
}

export function percentile(values, quantile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1)];
}
