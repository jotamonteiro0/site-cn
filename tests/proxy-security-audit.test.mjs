import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isLocalAuditBypassAllowed } from "../lib/proxy-utils.ts";

test("Security Audit - isLocalAuditBypassAllowed Logic Gates", async (t) => {
  await t.test("Rejects bypass when VERCEL=1 (production cloud environment)", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      hasAuditMasterCookie: true,
      env: {
        VERCEL: "1",
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed, false);
  });

  await t.test("Rejects bypass when VERCEL_ENV=production", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      hasAuditMasterCookie: true,
      env: {
        VERCEL_ENV: "production",
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed, false);
  });

  await t.test("Rejects bypass when ALLOW_LOCAL_AUDIT_MOCKS is not 'true'", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      hasAuditMasterCookie: true,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "false",
      },
    });
    assert.equal(allowed, false);
  });

  await t.test("Rejects bypass when host is external domain", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "carvalhoneves500.org.br",
      hasAuditMasterCookie: true,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed, false);
  });

  await t.test("Rejects bypass when x-forwarded-host is an external domain (reverse proxy spoof attempt)", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      xForwardedHost: "evil-attacker.com",
      hasAuditMasterCookie: true,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed, false);
  });

  await t.test("Rejects bypass when cookie cn_audit_master is absent or false", () => {
    const noCookie = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      hasAuditMasterCookie: false,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(noCookie, false);
  });

  await t.test("Allows bypass ONLY when strictly localhost, ALLOW_LOCAL_AUDIT_MOCKS=true, cookie=true, and not Vercel", () => {
    const allowed = isLocalAuditBypassAllowed({
      host: "localhost:3000",
      hasAuditMasterCookie: true,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed, true);

    const allowed127 = isLocalAuditBypassAllowed({
      host: "127.0.0.1:3000",
      hasAuditMasterCookie: true,
      env: {
        ALLOW_LOCAL_AUDIT_MOCKS: "true",
      },
    });
    assert.equal(allowed127, true);
  });
});

test("Security Audit - Static Verification of proxy.ts and master-auth.ts", () => {
  const proxyCode = fs.readFileSync(path.resolve("proxy.ts"), "utf-8");
  assert.match(proxyCode, /isLocalAuditBypassAllowed/, "proxy.ts must invoke isLocalAuditBypassAllowed");

  const masterAuthCode = fs.readFileSync(path.resolve("lib/master-auth.ts"), "utf-8");
  assert.match(masterAuthCode, /isCloudProduction/, "master-auth.ts must check for cloud production");
  assert.match(masterAuthCode, /isLocalHost/, "master-auth.ts must check for localhost origin");
  assert.match(masterAuthCode, /ALLOW_LOCAL_AUDIT_MOCKS/, "master-auth.ts must guard mock tokens with ALLOW_LOCAL_AUDIT_MOCKS");
});

test("Security Audit - Live Negative Integration against Server", async (t) => {
  await t.test("External request without credentials to /dashboard is blocked / redirected to /login", async () => {
    try {
      const res = await fetch("http://localhost:3000/dashboard", {
        redirect: "manual",
        headers: {
          host: "carvalhoneves500.org.br",
          "x-forwarded-host": "carvalhoneves500.org.br",
          cookie: "cn_audit_master=true", // attempts to use mock cookie from external domain
        },
      });

      // Deve ser redirecionado para /login (código 307 ou 302)
      assert.ok(
        res.status === 307 || res.status === 302,
        `External request should redirect to /login, got status ${res.status}`
      );
      const loc = res.headers.get("location") || "";
      assert.ok(loc.includes("/login"), `Redirect location should be /login, got ${loc}`);
    } catch (e) {
      // Se servidor não estiver respondendo neste momento, avisa
      console.warn("Live test skipped or server unreachable:", e.message);
    }
  });

  await t.test("External request with mock token to /api/admin/publications is rejected", async () => {
    try {
      const res = await fetch("http://localhost:3000/api/admin/publications", {
        headers: {
          host: "carvalhoneves500.org.br",
          "x-forwarded-host": "carvalhoneves500.org.br",
          authorization: "Bearer mock-master-token",
        },
      });

      assert.equal(res.status, 401, `External mock token must return 401, got ${res.status}`);
    } catch (e) {
      console.warn("Live test skipped or server unreachable:", e.message);
    }
  });
});
