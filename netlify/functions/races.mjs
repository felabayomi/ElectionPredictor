import { neon } from "@neondatabase/serverless";

const BACKEND_BASE =
  process.env.ELECTION_PREDICTOR_BACKEND_BASE_URL ||
  "https://felix-platform-backend.onrender.com/api/election-predictor";

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getRouteParts(pathname) {
  const normalized = String(pathname || "");
  if (normalized.startsWith("/api/races")) {
    return normalized.replace(/^\/api/, "");
  }
  if (normalized.startsWith("/.netlify/functions/races")) {
    const suffix = normalized.replace(/^\/\.netlify\/functions\/races/, "");
    return `/races${suffix}`;
  }
  return "/races";
}

async function fetchBackend(path, method, body, headers) {
  const response = await fetch(`${BACKEND_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

async function enrichRaceRows(sql, raceIds) {
  if (!raceIds.length) return [];
  const rows = await sql(
    "SELECT id, created_at, created_by_email FROM ep_races WHERE id = ANY($1::text[])",
    [raceIds],
  );
  return rows || [];
}

function mergeRaceMeta(race, row) {
  if (!race || !row) return race;
  return {
    ...race,
    createdAt: race.createdAt || row.created_at || undefined,
    createdByEmail: race.createdByEmail || row.created_by_email || undefined,
  };
}

function withQuery(path, queryString) {
  return queryString ? `${path}?${queryString}` : path;
}

export async function handler(event) {
  try {
    const method = (event.httpMethod || "GET").toUpperCase();
    const basePath = getRouteParts(event.path || "");
    const backendPath = withQuery(basePath, event.rawQuery || "");

    const proxied = await fetchBackend(
      backendPath,
      method,
      event.body ? JSON.parse(event.body) : undefined,
      {
        "x-admin-key": event.headers?.["x-admin-key"] || event.headers?.["X-Admin-Key"] || "",
        "x-subscriber-email": event.headers?.["x-subscriber-email"] || event.headers?.["X-Subscriber-Email"] || "",
      },
    );

    if (!proxied.ok) {
      return {
        statusCode: proxied.status,
        headers: { "content-type": "application/json" },
        body: proxied.text,
      };
    }

    if (method !== "GET") {
      return {
        statusCode: proxied.status,
        headers: { "content-type": "application/json" },
        body: proxied.text,
      };
    }

    let payload;
    try {
      payload = proxied.text ? JSON.parse(proxied.text) : null;
    } catch {
      return {
        statusCode: proxied.status,
        headers: { "content-type": "application/json" },
        body: proxied.text,
      };
    }

    const databaseUrl = process.env.ELECTION_PREDICTOR_NEON_DATABASE_URL;
    if (!databaseUrl) {
      return json(proxied.status, payload);
    }

    const sql = neon(databaseUrl);

    if (Array.isArray(payload)) {
      const ids = payload
        .map((item) => item?.race?.id)
        .filter((id) => typeof id === "string");
      const rows = await enrichRaceRows(sql, ids);
      const byId = new Map(rows.map((row) => [row.id, row]));

      const enriched = payload.map((item) => {
        const row = byId.get(item?.race?.id);
        return {
          ...item,
          race: mergeRaceMeta(item?.race, row),
        };
      });

      return json(proxied.status, enriched);
    }

    if (payload?.race?.id) {
      const rows = await enrichRaceRows(sql, [payload.race.id]);
      const row = rows[0];
      return json(proxied.status, {
        ...payload,
        race: mergeRaceMeta(payload.race, row),
      });
    }

    return json(proxied.status, payload);
  } catch (error) {
    console.error("races proxy error", error);
    return json(500, { error: "Internal server error" });
  }
}
