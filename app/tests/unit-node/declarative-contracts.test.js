import assert from "node:assert/strict";
import { once } from "node:events";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Linter } from "eslint";
import express from "express";
import { describe, it, vi } from "vitest";

import { createApp } from "../../middleware/createApp.js";
import { PUBLIC_CONTENTFUL_ROUTE_PATHS } from "../../middleware/routes/contentful.js";
import { startServer } from "../../middleware/server.js";
import { quasarBuildEnvironment, quasarDevServerProxy } from "../../quasarBuildManifest.js";
import { scanBuiltAssetsForCredentials } from "../../scripts/scan-built-assets.js";
import routes from "../../src/router/routes.js";

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));
vi.mock("#q-app", () => ({ defineConfig: (configuration) => configuration }));

const readProjectFile = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const withFixtureDir = (files, callback) => {
  const directory = mkdtempSync(join(tmpdir(), "credential-contract-"));

  try {
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(directory, name), contents);
    }

    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const withHttpServer = async (app, callback) => {
  const server = await new Promise((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });

  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
};

const parseNetlifyToml = (source) => {
  const document = { headers: [], redirects: [] };
  let current;

  const objectAt = (path) => {
    let target = document;

    for (const segment of path) {
      target[segment] ??= {};
      target = Array.isArray(target[segment]) ? target[segment].at(-1) : target[segment];
    }

    return target;
  };

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    const arrayTable = line.match(/^\[\[([\w.-]+)\]\]$/);
    if (arrayTable) {
      const path = arrayTable[1].split(".");
      const name = path.pop();
      const parent = objectAt(path);

      parent[name] ??= [];
      current = {};
      parent[name].push(current);
      continue;
    }

    const table = line.match(/^\[([\w.-]+)\]$/);
    if (table) {
      current = objectAt(table[1].split("."));
      continue;
    }

    const assignment = line.match(/^([\w-]+)\s*=\s*(.+)$/);
    if (!assignment) throw new Error(`Unsupported Netlify TOML: ${line}`);

    const [, key, serializedValue] = assignment;
    current[key] = serializedValue.startsWith('"')
      ? JSON.parse(serializedValue)
      : serializedValue === "true"
        ? true
        : serializedValue === "false"
          ? false
          : Number(serializedValue);
  }

  return document;
};

const parseCsp = (header) => {
  const directives = new Map();

  for (const serializedDirective of header.split(";")) {
    if (!serializedDirective.trim()) continue;

    const [name, ...sources] = serializedDirective.trim().split(/\s+/);
    if (directives.has(name)) throw new Error(`Duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }

  return directives;
};

const parseRobots = (source) => {
  const groups = [];
  let current;

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const [field, value] = line.split(":", 2).map((part) => part.trim());
    if (field.toLowerCase() === "user-agent") {
      current = { agent: value, disallow: [] };
      groups.push(current);
    } else if (field.toLowerCase() === "disallow" && current) {
      current.disallow.push(value);
    }
  }

  return groups;
};

const parseScriptTags = (source) =>
  [...source.matchAll(/<script\s+([^>]+)>/gi)].map((match) => {
    const attributes = {};

    for (const attribute of match[1].matchAll(/([\w-]+)(?:=("[^"]*"|'[^']*'))?/g)) {
      const [, name, serializedValue] = attribute;
      attributes[name] = serializedValue ? serializedValue.slice(1, -1) : true;
    }

    return attributes;
  });

const withIsolatedFunctions = async (callback) => {
  const directory = mkdtempSync(join(tmpdir(), "functions-contract-"));
  const functionsDirectory = join(directory, "functions");

  cpSync(new URL("../../netlify/functions", import.meta.url), functionsDirectory, { recursive: true });

  try {
    return await callback((file) => import(pathToFileURL(join(functionsDirectory, file)).href));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const moduleSpecifiersFrom = (source) => {
  const specifiers = [];
  const linter = new Linter();
  const collect = (node) => {
    if (typeof node.source.value === "string") specifiers.push(node.source.value);
  };
  const plugin = {
    rules: {
      "collect-module-specifiers": {
        create: () => ({ ImportDeclaration: collect, ImportExpression: collect }),
      },
    },
  };

  assert.deepEqual(
    linter.verify(source, [
      {
        languageOptions: { ecmaVersion: 2022, sourceType: "module" },
        plugins: { contract: plugin },
        rules: { "contract/collect-module-specifiers": "error" },
      },
    ]),
    []
  );

  return specifiers;
};

const probeRouter = (name) => express.Router().get("/contract-probe", (_, response) => response.json({ name }));

describe("declarative deployment contracts", () => {
  it("starts the import-safe server entrypoint with an injected environment loader", async () => {
    let environmentLoads = 0;
    const server = startServer({
      env: { NODE_ENV: "production", ALLOWED_ORIGINS: " https://preview.example.test " },
      loadEnv: () => {
        environmentLoads += 1;
      },
      onListen: () => undefined,
      port: 0,
    });
    await once(server, "listening");

    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/healthz`, {
        headers: { Origin: "https://preview.example.test" },
      });

      assert.equal(environmentLoads, 1);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://preview.example.test");
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it("declares the complete public Contentful endpoint family", () => {
    assert.deepEqual(PUBLIC_CONTENTFUL_ROUTE_PATHS, [
      "/entries",
      "/blog-index",
      "/blog-years",
      "/tags",
      "/tagged",
      "/article/:slug",
      "/article-navigation/:slug",
      "/author/:slug",
    ]);
  });

  it("applies CORS over HTTP and mounts the administrative and public routers", async () => {
    const app = createApp({
      nodeEnv: "development",
      adminRoutes: probeRouter("admin"),
      publicRoutes: probeRouter("public"),
    });

    await withHttpServer(app, async (baseUrl) => {
      const health = await fetch(`${baseUrl}/healthz`, { headers: { Origin: "http://localhost:1991" } });
      assert.equal(health.status, 200);
      assert.equal(health.headers.get("access-control-allow-origin"), "http://localhost:1991");
      assert.deepEqual(await (await fetch(`${baseUrl}/api/admin/contentful/contract-probe`)).json(), { name: "admin" });
      assert.deepEqual(await (await fetch(`${baseUrl}/api/contentful/contract-probe`)).json(), { name: "public" });
    });

    await withHttpServer(createApp({ nodeEnv: "production" }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/healthz`, { headers: { Origin: "http://localhost:1991" } });
      assert.equal(response.status, 500);
    });

    await withHttpServer(createApp({ nodeEnv: "production", allowedOrigins: ["https://preview.example.test"] }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/healthz`, { headers: { Origin: "https://preview.example.test" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://preview.example.test");
    });

    await withHttpServer(createApp(), async (baseUrl) => {
      const muteConfigurationError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      try {
        const admin = await fetch(`${baseUrl}/api/admin/contentful/articles`);
        const publicResponse = await fetch(`${baseUrl}/api/contentful/tagged`);

        assert.equal(admin.status, 401);
        assert.equal(publicResponse.status, 400);
        assert.deepEqual(await publicResponse.json(), { error: "Invalid tag" });
      } finally {
        muteConfigurationError.mockRestore();
      }
    });
  });

  it("detects credential names and secret values while ignoring binary assets", () => {
    withFixtureDir({ "clean.js": "const cloud = 'public-cloud-name'; const folder = 'public-folder';" }, (rootDir) => {
      assert.deepEqual(
        scanBuiltAssetsForCredentials({
          rootDir,
          env: { CLOUDINARY_CLOUD_NAME: "public-cloud-name", CLOUDINARY_UPLOAD_FOLDER: "public-folder" },
        }),
        []
      );
    });

    withFixtureDir(
      {
        "app.js":
          "CONTENTFUL_MANAGEMENT_KEY CONTENTFUL_MANAGEMENT_TOKEN CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET CLOUDINARY_UPLOAD_FOLDER CLOUDINARY_FOLDER CLOUDINARY_UPLOAD_PRESET CLOUDINARY_URL cfmgmt_sanitized_secret_123 cfmgmt_sanitized_token_456 cloudinary_sanitized_key_123 cloudinary_sanitized_secret_456 cloudinary_sanitized_preset_789 cloudinary_sanitized_url_012",
        "image.png": "CLOUDINARY_API_SECRET",
      },
      (rootDir) => {
        const env = {
          CONTENTFUL_MANAGEMENT_KEY: "cfmgmt_sanitized_secret_123",
          CONTENTFUL_MANAGEMENT_TOKEN: "cfmgmt_sanitized_token_456",
          CLOUDINARY_CLOUD_NAME: "public-cloud-name",
          CLOUDINARY_API_KEY: "cloudinary_sanitized_key_123",
          CLOUDINARY_API_SECRET: "cloudinary_sanitized_secret_456",
          CLOUDINARY_UPLOAD_FOLDER: "public-folder",
          CLOUDINARY_FOLDER: "public-folder-alias",
          CLOUDINARY_UPLOAD_PRESET: "cloudinary_sanitized_preset_789",
          CLOUDINARY_URL: "cloudinary_sanitized_url_012",
        };

        assert.deepEqual(scanBuiltAssetsForCredentials({ rootDir, env }), [
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_KEY" },
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_KEY value" },
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_TOKEN" },
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_TOKEN value" },
          { file: "app.js", indicator: "CLOUDINARY_CLOUD_NAME" },
          { file: "app.js", indicator: "CLOUDINARY_API_KEY" },
          { file: "app.js", indicator: "CLOUDINARY_API_KEY value" },
          { file: "app.js", indicator: "CLOUDINARY_API_SECRET" },
          { file: "app.js", indicator: "CLOUDINARY_API_SECRET value" },
          { file: "app.js", indicator: "CLOUDINARY_UPLOAD_FOLDER" },
          { file: "app.js", indicator: "CLOUDINARY_FOLDER" },
          { file: "app.js", indicator: "CLOUDINARY_UPLOAD_PRESET" },
          { file: "app.js", indicator: "CLOUDINARY_UPLOAD_PRESET value" },
          { file: "app.js", indicator: "CLOUDINARY_URL" },
          { file: "app.js", indicator: "CLOUDINARY_URL value" },
        ]);
        assert.deepEqual(scanBuiltAssetsForCredentials({ rootDir, env: {} }), [
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_KEY" },
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_TOKEN" },
          { file: "app.js", indicator: "CLOUDINARY_CLOUD_NAME" },
          { file: "app.js", indicator: "CLOUDINARY_API_KEY" },
          { file: "app.js", indicator: "CLOUDINARY_API_SECRET" },
          { file: "app.js", indicator: "CLOUDINARY_UPLOAD_FOLDER" },
          { file: "app.js", indicator: "CLOUDINARY_FOLDER" },
          { file: "app.js", indicator: "CLOUDINARY_UPLOAD_PRESET" },
          { file: "app.js", indicator: "CLOUDINARY_URL" },
        ]);
      }
    );
  });

  it("marks administrative route metadata and canonicalizes legacy tag URLs", () => {
    const mainLayout = routes.find((route) => route.path === "/");
    const children = mainLayout.children;
    const routeAt = (path) => children.find((route) => route.path === path);

    assert.deepEqual(
      children.map(({ path, name, meta, redirect }) => ({ path, name: name ?? null, meta: meta ?? {}, redirect: Boolean(redirect) })),
      [
        { path: "", name: null, meta: { title: "Home" }, redirect: false },
        { path: "/about", name: "Prefácio", meta: { title: "About" }, redirect: false },
        { path: "/blog", name: "Meus Artigos", meta: { title: "Artigos" }, redirect: false },
        { path: "/blog/:slug", name: "Artigo", meta: {}, redirect: false },
        { path: "/blog/authors/:slug", name: "Author", meta: { title: "Author" }, redirect: false },
        { path: "/blog/tags/:tag", name: null, meta: {}, redirect: true },
        { path: "/admin", name: "Admin", meta: { title: "Admin", requiresAdmin: true }, redirect: false },
        { path: "/admin/articles/new", name: "Admin Article New", meta: { title: "New Article", requiresAdmin: true }, redirect: false },
        { path: "/admin/articles/:entryId/edit", name: "Admin Article Edit", meta: { title: "Edit Article", requiresAdmin: true }, redirect: false },
        { path: "/admin/profile", name: "Author Profile", meta: { title: "Author Profile", requiresAdmin: true }, redirect: false },
        { path: "/admin/tags", name: "Admin Tags", meta: { title: "Tag management", requiresAdmin: true, requiresOwner: true }, redirect: false },
      ]
    );
    assert.deepEqual(routes.filter((route) => route.path !== "/").map(({ path, name, meta }) => ({ path, name: name ?? null, meta: meta ?? {} })), [
      { path: "/:catchAll(.*)", name: null, meta: {} },
    ]);
    assert.deepEqual(routeAt("/blog/tags/:tag").redirect({ params: { tag: "architecture" } }), {
      name: "Meus Artigos",
      query: { tag: "architecture" },
    });
  });

  it("routes APIs before the SPA fallback and supplies complete browser security headers", () => {
    const configuration = parseNetlifyToml(readProjectFile("../../netlify.toml"));
    const headers = configuration.headers.find((entry) => entry.for === "/*").values;
    const csp = parseCsp(headers["Content-Security-Policy"]);

    assert.deepEqual(configuration.redirects, [
      { from: "/api/admin/contentful/*", to: "/.netlify/functions/contentful-admin/:splat", status: 200, force: true },
      { from: "/api/contentful/*", to: "/.netlify/functions/contentful/:splat", status: 200, force: true },
      { from: "/*", to: "index.html", status: 200 },
    ]);
    assert.equal(configuration.build.environment.SECRETS_SCAN_OMIT_KEYS, "CLOUDINARY_UPLOAD_FOLDER,CLOUDINARY_FOLDER");
    assert.deepEqual([...csp.entries()], [
      ["default-src", ["https:"]],
      ["connect-src", ["'self'", "https://identity.netlify.com", "https://media-editor.cloudinary.com", "https://res.cloudinary.com"]],
      ["script-src", ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://identity.netlify.com", "https://media-editor.cloudinary.com"]],
      ["frame-src", ["'self'", "https://media-editor.cloudinary.com"]],
      ["style-src", ["'self'", "'unsafe-inline'"]],
      [
        "img-src",
        [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://images.ctfassets.net",
          "https://gravatar.com",
          "https://www.gravatar.com",
          "https://en.gravatar.com",
          "https://secure.gravatar.com",
          "https://cdn.jsdelivr.net",
        ],
      ],
    ]);
    assert.equal(headers["Referrer-Policy"], "no-referrer-when-downgrade");
    assert.equal(headers["Strict-Transport-Security"], "max-age=15552000; includeSubDomains; preload");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
    assert.equal(headers["X-XSS-Protection"], "1; mode=block");
  });

  it("uses a pure frontend manifest with no credential bindings and both local API proxies", () => {
    assert.deepEqual(quasarBuildEnvironment, {});
    assert.equal(quasarDevServerProxy["/api/admin/contentful"].target, "http://localhost:3000");
    assert.equal(quasarDevServerProxy["/api"].target, "http://localhost:3000");
  });

  it("uses the pure manifest in the actual Quasar configuration without loading dotenv", async () => {
    const { default: quasarConfig } = await import("../../quasar.config.js");
    const configuration = quasarConfig({ mode: { capacitor: false } });

    assert.deepEqual(configuration.build.env, quasarBuildEnvironment);
    assert.deepEqual(configuration.devServer.proxy, quasarDevServerProxy);
  });

  it("loads every Netlify wrapper and core from an isolated functions copy", async () => {
    await withIsolatedFunctions(async (importFunction) => {
      await importFunction("contentful.js");
      await importFunction("contentfulProxyCore.js");
      await importFunction("contentful-admin.js");
      await importFunction("contentfulAdminCore.js");
    });
  });

  it("collects static and dynamic Function module specifiers through ESLint's API", () => {
    const specifiers = Object.fromEntries(
      ["contentful.js", "contentfulProxyCore.js", "contentful-admin.js", "contentfulAdminCore.js"].map((file) => [
        file,
        moduleSpecifiersFrom(readProjectFile(`../../netlify/functions/${file}`)),
      ])
    );

    assert.deepEqual(specifiers["contentful.js"], ["./contentfulProxyCore.js"]);
    assert.deepEqual(specifiers["contentful-admin.js"], ["./contentfulAdminCore.js"]);
    assert.equal(specifiers["contentfulProxyCore.js"].every((specifier) => specifier !== "contentful" && !specifier.startsWith("contentful/")), true);
  });

  it("disallows administrative crawling and includes the Identity widget", () => {
    const robots = parseRobots(readProjectFile("../../public/robots.txt"));
    const scripts = parseScriptTags(readProjectFile("../../index.html"));

    assert.equal(robots.find((group) => group.agent === "*").disallow.includes("/admin"), true);
    assert.equal(scripts.some((attributes) => attributes.src === "https://identity.netlify.com/v1/netlify-identity-widget.js" && attributes.defer === true), true);
  });
});
