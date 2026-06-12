export const CANONICAL_ORIGIN = "https://briefpicks.com";
export const VIDEO_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ALLOWED_METHODS = ["GET", "HEAD"];
const REQUIRED_UTM_FIELDS = ["source", "medium", "campaign", "content"];
const UTM_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term"
]);
const DESTINATION_INJECTION_KEYS = new Set([
  "url",
  "u",
  "target",
  "redirect",
  "destination",
  "next"
]);
const PLATFORM_CLICK_KEYS = new Set([
  "gclid",
  "fbclid",
  "ttclid",
  "msclkid",
  "gbraid",
  "wbraid",
  "dclid",
  "_gl"
]);
const UTM_VALUE_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function handleGoRequest({ request, params = {}, links = {} }) {
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.includes(method)) {
    return methodNotAllowedResponse();
  }

  const videoId = normalizeVideoId(params.video_id);

  if (!isValidVideoId(videoId)) {
    return errorResponse(404, "BriefPicks link not found.");
  }

  const entry = links[videoId];

  if (!entry) {
    return errorResponse(404, "BriefPicks link not found.");
  }

  if (entry.enabled !== true) {
    return errorResponse(410, "This BriefPicks link is no longer active.");
  }

  let destination;
  try {
    destination = buildRedirectUrl(entry, { videoId, requestUrl: request.url });
  } catch {
    return errorResponse(500, "This BriefPicks link is temporarily unavailable.");
  }

  return new Response(method === "HEAD" ? null : "Redirecting to BriefPicks.", {
    status: 302,
    headers: {
      ...noStoreHeaders(),
      Location: destination
    }
  });
}

export function buildRedirectUrl(entry, { videoId, requestUrl }) {
  validateMapEntry(entry, videoId);

  const destination = normalizeDestinationUrl(entry.destination_url);
  stripTrackingParams(destination);
  applyMapUtm(destination, entry.default_utm, videoId);

  // We deliberately ignore caller query parameters for v0. The map is the only source of truth.
  new URL(requestUrl);

  return destination.toString();
}

export function isValidVideoId(videoId) {
  return typeof videoId === "string" && VIDEO_ID_PATTERN.test(videoId);
}

export function normalizeDestinationUrl(destinationUrl) {
  if (typeof destinationUrl !== "string" || destinationUrl.trim() === "") {
    throw new Error("Missing destination URL");
  }

  const trimmed = destinationUrl.trim();

  if (trimmed.startsWith("//")) {
    throw new Error("Protocol-relative destinations are blocked");
  }

  if (trimmed.startsWith("/")) {
    return new URL(trimmed, CANONICAL_ORIGIN);
  }

  const destination = new URL(trimmed);

  if (destination.protocol !== "https:") {
    throw new Error("Only https destinations are allowed");
  }

  return destination;
}

export function sanitizeUtmValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const decoded = decodeURIComponent(value).trim().toLowerCase();

  if (decoded.length === 0 || decoded.length > 80) {
    return null;
  }

  if (!UTM_VALUE_PATTERN.test(decoded)) {
    return null;
  }

  if (decoded.includes("@") || decoded.includes("://")) {
    return null;
  }

  if (/^\d{8,}$/.test(decoded)) {
    return null;
  }

  if (/^[a-f0-9]{32,}$/i.test(decoded)) {
    return null;
  }

  if (/^[a-z0-9+/]{24,}={0,2}$/i.test(decoded)) {
    return null;
  }

  return decoded;
}

function normalizeVideoId(videoId) {
  if (Array.isArray(videoId)) {
    return videoId[0] ?? "";
  }

  return typeof videoId === "string" ? videoId : "";
}

function validateMapEntry(entry, videoId) {
  if (!entry || typeof entry !== "object") {
    throw new Error("Missing map entry");
  }

  if (!isValidVideoId(videoId)) {
    throw new Error("Invalid video ID");
  }

  if (entry.default_utm?.content !== videoId) {
    throw new Error("UTM content must match video ID");
  }

  for (const field of REQUIRED_UTM_FIELDS) {
    if (!sanitizeUtmValue(entry.default_utm?.[field])) {
      throw new Error(`Invalid UTM ${field}`);
    }
  }

  if (isCommercialEntry(entry)) {
    if (entry.disclosure_required !== true) {
      throw new Error("Commercial redirects require disclosure");
    }

    if (typeof entry.disclosure_text !== "string" || entry.disclosure_text.trim() === "") {
      throw new Error("Commercial redirects require disclosure text");
    }

    if (entry.source_disclosure_present !== true) {
      throw new Error("Commercial social redirects require source disclosure");
    }
  }
}

function isCommercialEntry(entry) {
  return (
    entry.destination_type === "affiliate" ||
    entry.destination_type === "retailer" ||
    entry.destination_type === "sponsored" ||
    entry.commercial_relationship === "affiliate" ||
    entry.commercial_relationship === "sponsored" ||
    entry.disclosure_required === true
  );
}

function stripTrackingParams(destination) {
  for (const key of [...destination.searchParams.keys()]) {
    const normalizedKey = key.toLowerCase();

    if (
      UTM_QUERY_KEYS.has(normalizedKey) ||
      PLATFORM_CLICK_KEYS.has(normalizedKey) ||
      DESTINATION_INJECTION_KEYS.has(normalizedKey)
    ) {
      destination.searchParams.delete(key);
    }
  }
}

function applyMapUtm(destination, defaultUtm, videoId) {
  const mappedParams = {
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    content: "utm_content",
    term: "utm_term"
  };

  for (const [field, queryKey] of Object.entries(mappedParams)) {
    const value = sanitizeUtmValue(defaultUtm?.[field]);

    if (value) {
      destination.searchParams.set(queryKey, field === "content" ? videoId : value);
    }
  }
}

function methodNotAllowedResponse() {
  return new Response("Method not allowed.", {
    status: 405,
    headers: {
      ...noStoreHeaders(),
      Allow: "GET, HEAD"
    }
  });
}

function errorResponse(status, message) {
  return new Response(message, {
    status,
    headers: noStoreHeaders()
  });
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow"
  };
}
