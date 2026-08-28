import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import middleware, { edgeResponse, isAllowedHost } from "../middleware.ts";

const src = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

test("middleware source never reads the request body", () => {
  assert.doesNotMatch(src, /\.text\s*\(/);
  assert.doesNotMatch(src, /\.json\s*\(/);
  assert.doesNotMatch(src, /\.arrayBuffer\s*\(/);
  assert.doesNotMatch(src, /\.formData\s*\(/);
  assert.doesNotMatch(src, /\.blob\s*\(/);
  assert.doesNotMatch(src, /request\.body/);
  assert.doesNotMatch(src, /clone\s*\(/);
});

test("middleware does not set Content-Security-Policy", () => {
  assert.doesNotMatch(src, /Content-Security-Policy/);
});

test("matcher excludes webhook, cron, auth, and __grok", () => {
  assert.match(src, /api\/stripe\/webhook/);
  assert.match(src, /api\/cron\/daily-fetch/);
  assert.match(src, /api\/auth/);
  assert.match(src, /__grok/);
});

test("allowed hosts include public, volunteer, and vercel previews", () => {
  assert.equal(isAllowedHost("scratch-vault.com"), true);
  assert.equal(isAllowedHost("www.scratch-vault.com"), true);
  assert.equal(isAllowedHost("volunteer-scratch-vault.vercel.app"), true);
  assert.equal(isAllowedHost("scratch-vault.vercel.app"), true);
  assert.equal(isAllowedHost("scratch-vault-git-main-webb-spinner-visions.vercel.app"), true);
  assert.equal(isAllowedHost("evil.example"), false);
  assert.equal(isAllowedHost("godaddy.com"), false);
});

test("TRACE and TRACK return 405 without touching the body", () => {
  const trace = edgeResponse("TRACE", "https://scratch-vault.com/", "scratch-vault.com");
  assert.equal(trace?.status, 405);
  const track = edgeResponse("TRACK", "https://scratch-vault.com/", "scratch-vault.com");
  assert.equal(track?.status, 405);
});

test("unknown Host is 421; allowed Host continues", () => {
  const bad = middleware(
    new Request("https://scratch-vault.com/", { headers: { host: "evil.example" } }),
  );
  assert.equal(bad?.status, 421);
  const ok = middleware(
    new Request("https://scratch-vault.com/", { headers: { host: "scratch-vault.com" } }),
  );
  assert.equal(ok, undefined);
});

test("excluded webhook path is a no-op even if invoked", () => {
  const res = middleware(
    new Request("https://evil.example/api/stripe/webhook", {
      method: "POST",
      headers: { host: "evil.example" },
    }),
  );
  assert.equal(res, undefined);
});
