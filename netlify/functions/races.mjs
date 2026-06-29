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

async function resolveRaceTableAndColumns(sql) {
  const tableCandidates = ["ep_races", "races"];

  for (const tableName of tableCandidates) {
    const exists = await sql(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1",
      [tableName],
    );
    if (!exists.length) continue;

    const columns = await sql(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [tableName],
    );
    const names = new Set(columns.map((row) => row.column_name));

    const createdColumnCandidates = ["created_at", "createdat", "createdAt"];
    const creatorColumnCandidates = [
      "created_by_email",
      "createdbyemail",
      "createdByEmail",
      "subscriber_email",
      "owner_email",
      "created_by",
    ];

    const createdColumn = createdColumnCandidates.find((name) => names.has(name));
    const creatorColumn = creatorColumnCandidates.find((name) => names.has(name));

    return { tableName, createdColumn, creatorColumn };
  }

  return null;
}

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function enrichRaceRows(sql, raceIds) {
  if (!raceIds.length) return [];

  const resolved = await resolveRaceTableAndColumns(sql);
  if (!resolved) return [];

  const selectParts = ["id"];
  if (resolved.createdColumn) {
    selectParts.push(`${quoteIdentifier(resolved.createdColumn)} AS created_at`);
  }
  if (resolved.creatorColumn) {
    selectParts.push(`${quoteIdentifier(resolved.creatorColumn)} AS created_by_email`);
  }

  const query = `SELECT ${selectParts.join(", ")} FROM ${quoteIdentifier(resolved.tableName)} WHERE id = ANY($1::text[])`;
  const rows = await sql(query, [raceIds]);
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
      let rows = [];
      try {
        rows = await enrichRaceRows(sql, ids);
      } catch (error) {
        console.error("races enrich list error", error?.message || error);
      }
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
      let rows = [];
      try {
        rows = await enrichRaceRows(sql, [payload.race.id]);
      } catch (error) {
        console.error("races enrich detail error", error?.message || error);
      }
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
