import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { goLinks } from "../functions/_data/go-links.generated.mjs";
import {
  buildRedirectUrl,
  handleGoRequest,
  sanitizeUtmValue,
  VIDEO_ID_PATTERN
} from "../src/go-handler.mjs";

const sampleVideoId = "pet-tech-tractive-dog-gps-escape-alerts";
const firstWeekVideoIds = [
  "pet-tech-tractive-dog-gps-escape-alerts",
  "pet-tech-catit-pixi-smart-feeder-app-checks",
  "pet-tech-petlibro-feeder-schedule-checks",
  "pet-tech-petcube-treat-camera-fit",
  "pet-tech-litter-robot-4-sensor-checks",
  "pet-tech-catit-pixi-smart-fountain-app-checks",
  "pet-tech-closer-pets-mibowl-microchip-check"
];

function request(path, method = "GET") {
  return new Request(`https://briefpicks.com${path}`, { method });
}

function runHandler(videoId, path = `/go/${videoId}`, method = "GET", links = goLinks) {
  return handleGoRequest({
    request: request(path, method),
    params: { video_id: videoId },
    links
  });
}

test("mapped redirect uses the approved destination and map UTMs", async () => {
  const response = await runHandler(
    sampleVideoId,
    `/go/${sampleVideoId}?url=https%3A%2F%2Fevil.example&utm_source=evil&gclid=abc`
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");

  const location = new URL(response.headers.get("location"));
  assert.equal(location.origin, "https://briefpicks.com");
  assert.equal(location.pathname, "/uk/pet-tech/");
  assert.equal(location.searchParams.get("utm_source"), "tiktok");
  assert.equal(location.searchParams.get("utm_medium"), "short_video");
  assert.equal(location.searchParams.get("utm_campaign"), "pet_tech_v0");
  assert.equal(location.searchParams.get("utm_content"), sampleVideoId);
  assert.equal(location.searchParams.has("url"), false);
  assert.equal(location.searchParams.has("gclid"), false);
});

test("trailing slash and no-trailing-slash requests resolve the same mapped link", async () => {
  const withSlash = await runHandler(sampleVideoId, `/go/${sampleVideoId}/`);
  const withoutSlash = await runHandler(sampleVideoId, `/go/${sampleVideoId}`);

  assert.equal(withSlash.status, 302);
  assert.equal(withoutSlash.status, 302);
  assert.equal(withSlash.headers.get("location"), withoutSlash.headers.get("location"));
});

test("invalid and missing video IDs fail closed", async () => {
  assert.equal((await runHandler("Bad-ID")).status, 404);
  assert.equal((await runHandler("../private")).status, 404);
  assert.equal((await runHandler("")).status, 404);
  assert.equal((await runHandler("pet-tech-not-in-map")).status, 404);
});

test("disabled links return 410", async () => {
  const links = {
    [sampleVideoId]: {
      ...goLinks[sampleVideoId],
      enabled: false
    }
  };

  assert.equal((await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "GET", links)).status, 410);
});

test("invalid mapped destinations fail without redirecting", async () => {
  const links = {
    [sampleVideoId]: {
      ...goLinks[sampleVideoId],
      destination_url: "http://example.com/product"
    }
  };
  const response = await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "GET", links);

  assert.equal(response.status, 500);
  assert.equal(response.headers.has("location"), false);
});

test("destination URLs strip old UTMs, platform click IDs, and injection-style params", () => {
  const url = buildRedirectUrl(
    {
      ...goLinks[sampleVideoId],
      destination_url:
        "https://briefpicks.com/uk/pet-tech/?keep=ok&utm_source=old&fbclid=123&next=https://evil.example"
    },
    {
      videoId: sampleVideoId,
      requestUrl: `https://briefpicks.com/go/${sampleVideoId}?utm_term=ignored`
    }
  );

  const destination = new URL(url);
  assert.equal(destination.searchParams.get("keep"), "ok");
  assert.equal(destination.searchParams.get("utm_source"), "tiktok");
  assert.equal(destination.searchParams.has("fbclid"), false);
  assert.equal(destination.searchParams.has("next"), false);
  assert.equal(destination.searchParams.has("utm_term"), false);
});

test("unsupported methods return 405 with the allowed methods", async () => {
  const response = await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "POST");

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("HEAD returns redirect headers without a response body", async () => {
  const response = await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "HEAD");

  assert.equal(response.status, 302);
  assert.match(response.headers.get("location"), /^https:\/\/briefpicks\.com\/uk\/pet-tech\//);
  assert.equal(await response.text(), "");
});

test("Cloudflare Pages route wrapper calls the shared handler", async () => {
  const route = await import("../functions/go/[video_id].js");
  const response = await route.onRequest({
    request: request(`/go/${sampleVideoId}`),
    params: { video_id: sampleVideoId }
  });

  assert.equal(response.status, 302);
  assert.match(response.headers.get("location"), /^https:\/\/briefpicks\.com\/uk\/pet-tech\//);
});

test("commercial redirects require disclosure gates", async () => {
  const commercialWithoutDisclosure = {
    [sampleVideoId]: {
      ...goLinks[sampleVideoId],
      destination_url: "https://example.com/product",
      destination_type: "affiliate",
      commercial_relationship: "affiliate",
      disclosure_required: false
    }
  };
  const commercialWithoutSocialDisclosure = {
    [sampleVideoId]: {
      ...goLinks[sampleVideoId],
      destination_url: "https://example.com/product",
      destination_type: "affiliate",
      commercial_relationship: "affiliate",
      disclosure_required: true,
      disclosure_text: "Ad: affiliate link.",
      source_disclosure_present: false
    }
  };

  assert.equal(
    (await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "GET", commercialWithoutDisclosure)).status,
    500
  );
  assert.equal(
    (await runHandler(sampleVideoId, `/go/${sampleVideoId}`, "GET", commercialWithoutSocialDisclosure)).status,
    500
  );
});

test("go link map matches reviewed JSON and keeps v0 audience-first", async () => {
  const json = JSON.parse(await readFile(new URL("../functions/_data/go-links.json", import.meta.url), "utf8"));

  assert.deepEqual(goLinks, json);
  assert.equal(Object.keys(goLinks).length, 12);

  for (const [videoId, entry] of Object.entries(goLinks)) {
    assert.match(videoId, VIDEO_ID_PATTERN);
    assert.equal(entry.enabled, true);
    assert.equal(entry.destination_url, "https://briefpicks.com/uk/pet-tech/");
    assert.equal(entry.destination_type, "briefpicks_page");
    assert.equal(entry.commercial_relationship, "none");
    assert.equal(entry.disclosure_required, false);
    assert.equal(entry.default_utm.content, videoId);
  }

  for (const videoId of firstWeekVideoIds) {
    assert.ok(goLinks[videoId], `${videoId} missing from go map`);
  }
});

test("UTM sanitizer rejects personal or unsafe values", () => {
  assert.equal(sanitizeUtmValue("tiktok"), "tiktok");
  assert.equal(sanitizeUtmValue("Person@Email.test"), null);
  assert.equal(sanitizeUtmValue("https://example.com"), null);
  assert.equal(sanitizeUtmValue("1234567890123"), null);
  assert.equal(sanitizeUtmValue("ABC DEF"), null);
});

test("_routes, robots, and sitemap keep /go isolated from normal crawling", async () => {
  const routes = JSON.parse(await readFile(new URL("../_routes.json", import.meta.url), "utf8"));
  const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");

  assert.deepEqual(routes, {
    version: 1,
    include: ["/go/*"],
    exclude: []
  });
  assert.match(robots, /Disallow:\s*\/go\//);
  assert.doesNotMatch(sitemap, /\/go\//);
});

test("server-side go_click analytics remains disabled for issue 18", async () => {
  const handler = await readFile(new URL("../src/go-handler.mjs", import.meta.url), "utf8");
  const route = await readFile(new URL("../functions/go/[video_id].js", import.meta.url), "utf8");

  assert.doesNotMatch(`${handler}\n${route}`, /go_click|PIRSCH|waitUntil/);
});

test("draft video pages are generated from safe public data and omitted from sitemap", async () => {
  const pages = JSON.parse(await readFile(new URL("../src/_data/videoPages.json", import.meta.url), "utf8"));
  const template = await readFile(new URL("../src/v-pages.njk", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");

  assert.deepEqual(
    pages.map((page) => page.video_id),
    firstWeekVideoIds
  );
  assert.match(template, /robots:\s*noindex,nofollow/);
  assert.match(template, /permalink:\s*"\/v\/{{ video\.video_id }}\/index\.html"/);
  assert.doesNotMatch(sitemap, /\/v\//);

  for (const page of pages) {
    assert.match(page.video_id, VIDEO_ID_PATTERN);
    assert.equal(page.go_url.startsWith(`/go/${page.video_id}/?`), true);
    assert.equal(new URL(`https://briefpicks.com${page.go_url}`).searchParams.get("utm_content"), page.video_id);
    assert.equal(page.disclosure_text, "No commercial relationship is recorded for this brief.");
  }

  const publicPayload = JSON.stringify(pages);
  assert.doesNotMatch(publicPayload, /ASIN|Pre Affiliate|Audience growth|buy now|Amazon link|star rating/i);
});
