import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

function json(statusCode, body) {
    return {
        statusCode,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}

function normalizeEmail(value) {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

async function hasActiveSubscription(stripe, email) {
    try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customer = customers.data[0];
        if (!customer) return false;

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "all",
            limit: 10,
        });

        const latest = subscriptions.data.sort((a, b) => b.created - a.created)[0];
        if (!latest) return false;

        return latest.status === "active" || latest.status === "trialing";
    } catch (error) {
        console.error("Error checking Stripe subscription:", error.message);
        return false;
    }
}

async function resolveProfilesTable(sql) {
    const candidates = ["ep_subscriber_profiles", "subscriber_profiles"];

    for (const tableName of candidates) {
        const found = await sql(
            "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1",
            [tableName],
        );
        if (found.length > 0) return tableName;
    }

    throw new Error("No subscriber profiles table found");
}

export async function handler(event) {
    // Only handle POST and GET requests
    if (!["POST", "GET"].includes(event.httpMethod)) {
        return json(405, { error: "Method not allowed" });
    }

    try {
        const databaseUrl = process.env.ELECTION_PREDICTOR_NEON_DATABASE_URL;
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        
        if (!databaseUrl) {
            return json(500, { error: "Database connection not configured" });
        }
        if (!stripeSecretKey) {
            return json(500, { error: "Stripe not configured" });
        }

        const sql = neon(databaseUrl);
        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-06-24.dahlia" });
        const profilesTable = await resolveProfilesTable(sql);

        if (event.httpMethod === "POST") {
            // Extract email from headers
            const email = normalizeEmail(event.headers["x-subscriber-email"]);
            if (!email) {
                return json(400, { error: "Subscriber email header is required" });
            }

            // Check subscription status from Stripe
            const isActive = await hasActiveSubscription(stripe, email);

            if (!isActive) {
                return json(402, {
                    error: "Active subscription required",
                });
            }

            // Parse request body
            let body;
            try {
                body = JSON.parse(event.body || "{}");
            } catch (e) {
                return json(400, { error: "Invalid JSON in request body" });
            }

            const { displayName, bio, profileImageUrl, isPublic = true } = body;

            if (!displayName || typeof displayName !== "string") {
                return json(400, { error: "Display name is required" });
            }

            // Upsert profile
                        const result = await sql(
                                `INSERT INTO ${profilesTable} (email, display_name, bio, profile_image_url, is_public, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                 ON CONFLICT (email) DO UPDATE SET
                   display_name = $2,
                   bio = $3,
                   profile_image_url = $4,
                   is_public = $5,
                   updated_at = NOW()
                 RETURNING email, display_name, bio, profile_image_url, is_public, created_at, updated_at`,
                [
                    email,
                    displayName.trim(),
                    bio ? String(bio).trim() : null,
                    profileImageUrl ? String(profileImageUrl).trim() : null,
                    isPublic,
                ]
            );

            const profile = result[0];
            return json(200, {
                email: profile.email,
                displayName: profile.display_name,
                bio: profile.bio,
                profileImageUrl: profile.profile_image_url,
                isPublic: profile.is_public,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at,
            });
        }

        if (event.httpMethod === "GET") {
            // Get profile by email from query params
            const email = normalizeEmail(event.queryStringParameters?.email);
            if (!email) {
                return json(400, { error: "Email query parameter is required" });
            }

            const result = await sql(
                `SELECT email, display_name, bio, profile_image_url, is_public, created_at, updated_at FROM ${profilesTable} WHERE email = $1`,
                [email]
            );

            if (result.length === 0) {
                return json(404, { error: "Profile not found" });
            }

            const profile = result[0];
            return json(200, {
                email: profile.email,
                displayName: profile.display_name,
                bio: profile.bio,
                profileImageUrl: profile.profile_image_url,
                isPublic: profile.is_public,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at,
            });
        }
    } catch (error) {
        console.error("Error handling subscriber profile request:", error.message);
        return json(500, { error: "Internal server error" });
    }
}
