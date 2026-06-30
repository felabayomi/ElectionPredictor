const BACKEND_BASE = process.env.ELECTION_PREDICTOR_BACKEND_BASE_URL || "https://felix-platform-backend.onrender.com/api/election-predictor";
const MIN_SCENARIO_CANDIDATES = 2;
const MAX_SCENARIO_CANDIDATES = 12;

// Lightweight affiliation hints for common U.S. political figures used in scenario prompts.
const KNOWN_PARTY_BY_NAME = {
    "alexandria ocasio-cortez": "Democratic",
    "letitia james": "Democratic",
    "pat ryan": "Democratic",
    "ritchie torres": "Democratic",
    "tom suozzi": "Democratic",
    "chuck schumer": "Democratic",
    "dan crenshaw": "Republican",
    "greg abbott": "Republican",
    "john cornyn": "Republican",
    "ted cruz": "Republican",
    "j.d. vance": "Republican",
    "jd vance": "Republican",
    "marco rubio": "Republican",
    "ron desantis": "Republican",
    "ron de santis": "Republican",
    "nikki haley": "Republican",
    "tim scott": "Republican",
    "glenn youngkin": "Republican",
    "kamala harris": "Democratic",
    "gavin newsom": "Democratic",
    "gretchen whitmer": "Democratic",
    "josh shapiro": "Democratic",
    "michelle obama": "Democratic",
};

function json(statusCode, body) {
    return {
        statusCode,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}

function inferRaceTypeFromText(input) {
    const text = String(input || "").toLowerCase();
    if (/president|presidential|white\s+house/.test(text)) return "Presidential";
    if (/senate|senator/.test(text)) return "Senate";
    if (/house|congressional|representative\b/.test(text)) return "House";
    if (/governor|gubernatorial/.test(text)) return "Governor";
    return "Local";
}

function isValidDateParts(year, month, day) {
    const value = new Date(Date.UTC(year, month - 1, day));
    return value.getUTCFullYear() === year
        && value.getUTCMonth() === month - 1
        && value.getUTCDate() === day;
}

function formatIsoDate(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractExplicitDate(text) {
    const input = String(text || "");

    const iso = input.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
    if (iso) {
        const year = Number(iso[1]);
        const month = Number(iso[2]);
        const day = Number(iso[3]);
        if (isValidDateParts(year, month, day)) {
            return formatIsoDate(year, month, day);
        }
    }

    const us = input.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
    if (us) {
        const month = Number(us[1]);
        const day = Number(us[2]);
        const year = Number(us[3]);
        if (isValidDateParts(year, month, day)) {
            return formatIsoDate(year, month, day);
        }
    }

    return null;
}

function inferElectionYear(text) {
    const input = String(text || "");
    const currentYear = new Date().getUTCFullYear();
    const years = [...input.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
    const plausible = years.filter((year) => year >= currentYear - 2 && year <= currentYear + 12);
    if (plausible.length > 0) return plausible[0];
    return currentYear + 2;
}

function getGeneralElectionDay(year) {
    const nov1 = new Date(Date.UTC(year, 10, 1));
    const dayOfWeek = nov1.getUTCDay();
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    const firstMonday = 1 + daysUntilMonday;
    const electionDay = firstMonday + 1;
    return formatIsoDate(year, 11, electionDay);
}

function inferScenarioElectionDate({ raceTitle, raceType, query }) {
    const combined = `${String(raceTitle || "")} ${String(query || "")}`.trim();
    const explicitDate = extractExplicitDate(combined);
    if (explicitDate) return explicitDate;

    const year = inferElectionYear(combined);
    const isPrimary = /\bprimary|caucus|runoff\b/i.test(combined);

    if (isPrimary) {
        // Primary dates vary by state; use a pre-general placeholder within the same cycle.
        return formatIsoDate(year, 6, 1);
    }

    return getGeneralElectionDay(year);
}

function unique(values) {
    const seen = new Set();
    const out = [];
    for (const raw of values) {
        const value = String(raw || "").trim();
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
    }
    return out;
}

function isLikelyOfficeDescriptor(name) {
    const value = String(name || "").trim();
    if (!value) return false;

    // These terms indicate office/race descriptors, not person names.
    if (/(?:\bSenate\b|\bHouse\b|\bGovernor\b|\bPresidential\b|\bPrimary\b|\bGeneral\b|\bRace\b)/i.test(value)) {
        return true;
    }

    // A broad state/political adjective prefix followed by office words is almost certainly not a candidate.
    if (/^(?:[A-Z][a-z]+\s+)*(?:Democratic|Republican)\s+(?:Senate|House|Governor|Presidential)\b/.test(value)) {
        return true;
    }

    return false;
}

function normalizeNameKey(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function inferPartyFromName(name) {
    const key = normalizeNameKey(name);
    return KNOWN_PARTY_BY_NAME[key] || null;
}

const NAME_TOKEN_PATTERN = "[A-Z][A-Za-z'.-]+";
const FULL_NAME_PATTERN = `${NAME_TOKEN_PATTERN}(?:\\s+${NAME_TOKEN_PATTERN}){1,3}`;
const fullNameRegex = new RegExp(`^${FULL_NAME_PATTERN}$`);
const fullNameGlobalRegex = new RegExp(`\\b(${FULL_NAME_PATTERN})\\b`, "g");

function extractCandidatesFromQuery(query) {
    const text = String(query || "");
    const stopwordFirstNames = new Set([
        "What",
        "Who",
        "If",
        "Top",
        "Consider",
        "Democratic",
        "Republican",
        "Senate",
        "House",
        "Governor",
        "Presidential",
        "Primary",
        "Race",
        "Could",
        "Would",
        "Win",
        "Potential",
    ]);

    const bulletMatches = text
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/^[\-\*\u2022]\s*/, ""))
        .filter((line) => line && fullNameRegex.test(line) && !isLikelyOfficeDescriptor(line));

    if (bulletMatches.length >= 2) return unique(bulletMatches);

    const candidatesLabelMatch = text.match(/candidates\s*:\s*([^\n]+)/i);
    if (candidatesLabelMatch?.[1]) {
        const byComma = candidatesLabelMatch[1].split(",").map((s) => s.trim());
        const parsed = byComma.filter((name) => fullNameRegex.test(name) && !isLikelyOfficeDescriptor(name));
        if (parsed.length >= 2) return unique(parsed);
    }

    const betweenMatch = text.match(new RegExp(`between\\s+(${FULL_NAME_PATTERN})\\s+and\\s+(${FULL_NAME_PATTERN})`, "i"));
    const betweenNames = betweenMatch ? [betweenMatch[1], betweenMatch[2]] : [];

    const byComma = text
        .split(",")
        .flatMap((part) => {
            const matches = [];
            const regex = new RegExp(`\\b(${FULL_NAME_PATTERN})\\b`, "g");
            let match;
            while ((match = regex.exec(part)) !== null) {
                const candidate = match[1].trim();
                const firstName = candidate.split(/\s+/)[0];
                if (stopwordFirstNames.has(firstName)) continue;
                if (isLikelyOfficeDescriptor(candidate)) continue;
                matches.push(candidate);
            }
            return matches;
        });

    const embeddedMatches = [];
    const regex = fullNameGlobalRegex;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const candidate = match[1].trim();
        const firstName = candidate.split(/\s+/)[0];
        if (stopwordFirstNames.has(firstName)) continue;
        if (isLikelyOfficeDescriptor(candidate)) continue;
        embeddedMatches.push(candidate);
    }

    return unique([...betweenNames, ...byComma, ...embeddedMatches]);
}

function assignParty(index) {
    if (index === 0) return "Democratic";
    if (index === 1) return "Republican";
    return "Independent";
}

function inferPrimaryPartyFromQuery(query) {
    const text = String(query || "").toLowerCase();
    if (/\brepublican\b|\bgop\b/.test(text)) return "Republican";
    if (/\bdemocratic\b|\bdemocrat\b/.test(text)) return "Democratic";
    return null;
}

function inferSeatContextParty(query) {
    const text = String(query || "");
    const incumbentMatch = text.match(/if\s+([A-Z][A-Za-z'.-]+(?:\s+[A-Z][A-Za-z'.-]+){1,3})\s+retires/i);
    if (!incumbentMatch?.[1]) return null;
    return inferPartyFromName(incumbentMatch[1]);
}

function resolveCandidateParty(name, explicitPrimaryParty, seatContextParty) {
    if (explicitPrimaryParty) return explicitPrimaryParty;
    return inferPartyFromName(name) || seatContextParty;
}

function assignPartiesToCandidates(names, query) {
    const explicitPrimaryParty = inferPrimaryPartyFromQuery(query);
    const seatContextParty = inferSeatContextParty(query);

    let resolved = names.map((name, index) => ({
        name,
        party: resolveCandidateParty(name, explicitPrimaryParty, seatContextParty) || null,
        index,
    }));

    // If some names are unknown, use majority among known parties as the fallback.
    const counts = resolved.reduce((acc, item) => {
        if (!item.party) return acc;
        acc[item.party] = (acc[item.party] || 0) + 1;
        return acc;
    }, {});

    const majorityParty = counts.Democratic === counts.Republican
        ? null
        : (counts.Democratic || 0) > (counts.Republican || 0)
            ? "Democratic"
            : (counts.Republican || 0) > 0
                ? "Republican"
                : null;

    resolved = resolved.map((item) => ({
        ...item,
        party: item.party || majorityParty || assignParty(item.index),
    }));

    return resolved.map(({ name, party }) => ({ name, party }));
}

async function requestBackend(path, method, payload, headers = {}) {
    const response = await fetch(`${BACKEND_BASE}${path}`, {
        method,
        headers: {
            "content-type": "application/json",
            ...headers,
        },
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${response.status}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
}

async function createScenario({ raceTitle, raceType, candidates, query, subscriberEmail }) {
    const electionDate = inferScenarioElectionDate({ raceTitle, raceType, query });
    const headers = subscriberEmail ? { "x-subscriber-email": subscriberEmail } : {};
    const race = await requestBackend("/admin/races", "POST", {
        title: raceTitle,
        type: raceType,
        electionDate,
        description: "Generated from Subscriber Studio (date inferred when exact date not provided)",
    }, headers);

    const createdCandidates = [];
    for (const candidate of candidates) {
        const created = await requestBackend(`/admin/races/${race.id}/candidates`, "POST", {
            name: candidate.name,
            party: candidate.party,
        }, headers);
        createdCandidates.push(created);
    }

    const reanalysis = await requestBackend(`/admin/races/${race.id}/reanalyze`, "POST", {}, headers);
    return {
        race,
        candidates: createdCandidates,
        predictions: reanalysis?.predictions || [],
        insights: reanalysis?.insights || "",
    };
}

function resolveRoute(path) {
    if (path.endsWith("/custom-prediction")) return "custom";
    if (path.endsWith("/natural-language-analysis")) return "natural";
    if (/\/subscriber\/races\/[^/]+\/reanalyze$/.test(path)) return "subscriber-reanalyze";
    return "unknown";
}

function extractRaceIdFromPath(path) {
    const match = String(path || "").match(/\/subscriber\/races\/([^/]+)\/reanalyze$/);
    return match ? match[1] : "";
}

export async function handler(event) {
    try {
        if ((event.httpMethod || "GET").toUpperCase() !== "POST") {
            return json(405, { error: "Method not allowed" });
        }

        const route = resolveRoute(event.path || "");
        const payload = event.body ? JSON.parse(event.body) : {};

        if (route === "subscriber-reanalyze") {
            const raceId = extractRaceIdFromPath(event.path || "");
            if (!raceId) {
                return json(400, { error: "Race ID is required." });
            }

            const reanalysis = await requestBackend(`/admin/races/${raceId}/reanalyze`, "POST", {});
            const changed = Array.isArray(reanalysis?.predictions) ? reanalysis.predictions.length : 0;

            return json(200, {
                mode: "fallback-admin",
                model: null,
                fallbackReason: "subscriber-quota-validation-unavailable",
                changeSummary: {
                    changedCandidates: changed,
                    unchangedCandidates: 0,
                    maxDelta: 0,
                },
            });
        }

        if (route === "custom") {
            const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
            const normalized = candidates
                .map((candidate) => ({
                    name: String(candidate?.name || "").trim(),
                    party: String(candidate?.party || "Independent"),
                }))
                .filter((candidate) => candidate.name)
                .map((candidate, index) => ({
                    name: candidate.name,
                    party: ["Democratic", "Republican", "Independent"].includes(candidate.party)
                        ? candidate.party
                        : assignParty(index),
                }));

            if (normalized.length < MIN_SCENARIO_CANDIDATES) {
                return json(400, { error: `Please enter at least ${MIN_SCENARIO_CANDIDATES} candidates.` });
            }

            if (normalized.length > MAX_SCENARIO_CANDIDATES) {
                return json(400, { error: `Please limit to ${MAX_SCENARIO_CANDIDATES} candidates or fewer per scenario.` });
            }

            const raceType = ["Presidential", "Senate", "House", "Governor", "Local"].includes(payload.raceType)
                ? payload.raceType
                : "Local";

            const title = String(payload.raceTitle || "").trim() || "Custom Race Analysis";
            const subscriberEmail = event.headers["x-subscriber-email"] || "";
            const scenario = await createScenario({ raceTitle: title, raceType, candidates: normalized, query: title, subscriberEmail });

            return json(200, {
                raceId: scenario.race.id,
                title,
                candidates: scenario.candidates,
                predictions: scenario.predictions,
                analysis: scenario.insights || "Scenario generated successfully.",
            });
        }

        if (route === "natural") {
            const query = String(payload.query || "").trim();
            if (!query) {
                return json(400, { error: "Please enter a question or scenario" });
            }

            const names = extractCandidatesFromQuery(query);
            if (names.length < MIN_SCENARIO_CANDIDATES) {
                return json(400, {
                    error: `FACT_FINDING_QUESTION: Please include at least ${MIN_SCENARIO_CANDIDATES} candidate names to generate a scenario.`,
                });
            }

            if (names.length > MAX_SCENARIO_CANDIDATES) {
                return json(400, {
                    error: `Please limit your scenario to ${MAX_SCENARIO_CANDIDATES} candidates or fewer. We detected ${names.length}.`,
                });
            }

            const raceType = inferRaceTypeFromText(query);
            const raceTitle = `${raceType} Scenario: ${query.slice(0, 90)}`;
            const candidates = assignPartiesToCandidates(names, query);

            const subscriberEmail = event.headers["x-subscriber-email"] || "";
            const scenario = await createScenario({ raceTitle, raceType, candidates, query, subscriberEmail });

            return json(200, {
                raceId: scenario.race.id,
                query,
                raceTitle,
                candidates: scenario.candidates,
                predictions: scenario.predictions,
                analysis: scenario.insights || "Scenario generated from natural language query.",
            });
        }

        return json(404, { error: "Route not found" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return json(500, { error: message });
    }
}
