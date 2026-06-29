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

export async function handler(event) {
    // Only handle POST and GET requests
    if (!["POST", "GET"].includes(event.httpMethod)) {
        return json(405, { error: "Method not allowed" });
    }

    try {
        const databaseUrl = process.env.ELECTION_PREDICTOR_NEON_DATABASE_URL;
        if (!databaseUrl) {
            console.error("Database URL not configured");
            return json(500, { error: "Database connection not configured" });
        }

        const sql = neon(databaseUrl);

        if (event.httpMethod === "POST") {
            // Extract email from headers
            const email = normalizeEmail(event.headers["x-subscriber-email"]);
            console.log("POST request - email from header:", email);
            if (!email) {
                console.log("POST request - no email header");
                return json(402, {
                    error: "Active subscription required",
                    details: "Missing subscriber email header",
                });
            }

            // Check subscription status
            const subscriptions = await sql(
                "SELECT status FROM ep_subscriber_subscriptions WHERE email = $1",
                [email]
            );
            console.log("Subscription lookup result:", subscriptions);
            const subscription = subscriptions[0];
            const isActive = subscription && (subscription.status === "active" || subscription.status === "trialing");

            if (!isActive) {
                console.log("Subscription not active for:", email);
                return json(402, {
                    error: "Active subscription required",
                });
            }

            // Parse request body
            let body;
            try {
                body = JSON.parse(event.body || "{}");
                console.log("Parsed body:", body);
            } catch (e) {
                console.log("Body parse error:", e.message);
                return json(400, { error: "Invalid JSON in request body" });
            }

            const { displayName, bio, profileImageUrl, isPublic = true } = body;

            if (!displayName || typeof displayName !== "string") {
                return json(400, { error: "Display name is required" });
            }

            // Upsert profile
            const result = await sql(
                `INSERT INTO ep_subscriber_profiles (email, display_name, bio, profile_image_url, is_public, created_at, updated_at)
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
                "SELECT email, display_name, bio, profile_image_url, is_public, created_at, updated_at FROM ep_subscriber_profiles WHERE email = $1",
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
        console.error("Error handling subscriber profile request:", error.message, error.stack);
        return json(500, { error: "Internal server error", details: error.message });
    }
}
