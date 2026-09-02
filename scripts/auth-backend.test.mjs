import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  publicAuthStatus,
  resolveAuthBackend,
  resolveDatabaseUrl,
} from "../src/lib/auth/backend.ts";

test("empty env (local) uses PGLite and keeps broker + email", () => {
  const b = resolveAuthBackend({});
  assert.equal(b.usePostgres, false);
  assert.equal(b.usePglite, true);
  assert.equal(b.persistable, true);
  assert.equal(b.useBrokerOAuth, true);
  assert.equal(b.useEmailPassword, true);
  assert.deepEqual(publicAuthStatus({}), {
    database: false,
    oauth: true,
    email: true,
  });
});

test("Vercel without Postgres disables PGLite, broker preview, and email", () => {
  const env = { VERCEL: "1" };
  const b = resolveAuthBackend(env);
  assert.equal(b.onVercel, true);
  assert.equal(b.usePglite, false);
  assert.equal(b.usePostgres, false);
  assert.equal(b.persistable, false);
  assert.equal(b.useBrokerOAuth, false);
  assert.equal(b.useEmailPassword, false);
  assert.equal(b.usingPreviewClient, true);
  assert.deepEqual(publicAuthStatus(env), {
    database: false,
    oauth: false,
    email: false,
  });
});

test("Vercel + DATABASE_URL enables email, not grok_preview OAuth", () => {
  const env = { VERCEL: "1", DATABASE_URL: "postgresql://user:pass@host/db" };
  const b = resolveAuthBackend(env);
  assert.equal(b.usePostgres, true);
  assert.equal(b.usePglite, false);
  assert.equal(b.useEmailPassword, true);
  assert.equal(b.useBrokerOAuth, false);
  assert.deepEqual(publicAuthStatus(env), {
    database: true,
    oauth: false,
    email: true,
  });
});

test("Vercel + DATABASE_URL + real broker client enables OAuth", () => {
  const env = {
    VERCEL: "1",
    DATABASE_URL: "postgresql://user:pass@host/db",
    GROK_AUTH_CLIENT_ID: "scratch-vault-prod",
  };
  const b = resolveAuthBackend(env);
  assert.equal(b.usingPreviewClient, false);
  assert.equal(b.useBrokerOAuth, true);
  assert.equal(publicAuthStatus(env).oauth, true);
});

test("POSTGRES_URL is accepted as a DATABASE_URL alias", () => {
  assert.equal(resolveDatabaseUrl({ POSTGRES_URL: " postgresql://n " }), "postgresql://n");
  assert.equal(resolveDatabaseUrl({ POSTGRES_PRISMA_URL: "postgresql://p" }), "postgresql://p");
  assert.equal(
    resolveDatabaseUrl({
      DATABASE_URL: "postgresql://a",
      POSTGRES_URL: "postgresql://b",
    }),
    "postgresql://a",
  );
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: "  " }), undefined);
});

test("explicit grok_preview on Vercel still disables broker OAuth", () => {
  const b = resolveAuthBackend({
    VERCEL: "1",
    DATABASE_URL: "postgresql://n",
    GROK_AUTH_CLIENT_ID: "grok_preview",
  });
  assert.equal(b.usingPreviewClient, true);
  assert.equal(b.useBrokerOAuth, false);
});

test("login page stays client-safe (no preview secret / backend imports)", () => {
  const src = readFileSync(new URL("../src/routes/login.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /auth\/backend/);
  assert.doesNotMatch(src, /auth\/preview/);
  assert.doesNotMatch(src, /auth\/server/);
  assert.match(src, /auth\/status/);
});

test("auth route intercepts status and refuses mutating auth without a DB", () => {
  const src = readFileSync(new URL("../src/routes/api/auth/$.ts", import.meta.url), "utf8");
  assert.match(src, /publicAuthStatus/);
  assert.match(src, /AUTH_UNAVAILABLE/);
  assert.match(src, /503/);
  assert.match(src, /persistable/);
});

test("English and Spanish login keys stay in sync", () => {
  const en = JSON.parse(readFileSync(new URL("../src/locales/en.json", import.meta.url), "utf8"));
  const es = JSON.parse(readFileSync(new URL("../src/locales/es.json", import.meta.url), "utf8"));
  const loginKeys = Object.keys(en).filter((key) => key.startsWith("login."));
  for (const key of loginKeys) {
    assert.equal(typeof es[key], "string", `missing es ${key}`);
  }
});
