import Stripe from "stripe";

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

function hasActiveSubscription(status) {
    return status === "active" || status === "trialing";
}

async function findCustomerByEmail(stripe, email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    return customers.data[0] || null;
}

async function readStatus(stripe, email) {
    const customer = await findCustomerByEmail(stripe, email);
    if (!customer) {
        return { email, isActive: false, subscription: null };
    }

    const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 10,
    });

    const latest = subscriptions.data.sort((a, b) => b.created - a.created)[0] || null;
    if (!latest) {
        return { email, isActive: false, subscription: null };
    }

    return {
        email,
        isActive: hasActiveSubscription(latest.status),
        subscription: {
            status: latest.status,
            currentPeriodEnd: latest.current_period_end
                ? new Date(latest.current_period_end * 1000).toISOString()
                : undefined,
        },
    };
}

export async function handler(event) {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const stripePriceId = process.env.STRIPE_PRICE_ID;
        const appBaseUrl = process.env.APP_BASE_URL || "https://electionpredictor.net";

        if (!stripeSecretKey) {
            return json(503, { error: "Stripe is not configured" });
        }

        const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-06-24.dahlia" });

        const path = event.path || "";
        const normalizedPath = path.replace(/^.*\/api\/subscription\//, "");
        const method = (event.httpMethod || "GET").toUpperCase();

        if (normalizedPath.startsWith("status") && method === "GET") {
            const email = normalizeEmail(event.queryStringParameters?.email);
            if (!email) return json(400, { error: "Email is required" });
            const status = await readStatus(stripe, email);
            return json(200, status);
        }

        if (normalizedPath.startsWith("checkout") && method === "POST") {
            if (!stripePriceId) {
                return json(503, { error: "Stripe checkout is not configured" });
            }

            const payload = event.body ? JSON.parse(event.body) : {};
            const email = normalizeEmail(payload?.email);
            if (!email) return json(400, { error: "Valid email is required" });

            const session = await stripe.checkout.sessions.create({
                mode: "subscription",
                payment_method_types: ["card"],
                customer_email: email,
                line_items: [{ price: stripePriceId, quantity: 1 }],
                metadata: { email },
                success_url: `${appBaseUrl}/subscriber-studio?checkout=success&email=${encodeURIComponent(email)}`,
                cancel_url: `${appBaseUrl}/subscriber-studio?checkout=cancelled`,
            });

            return json(200, { checkoutUrl: session.url });
        }

        if (normalizedPath.startsWith("portal") && method === "POST") {
            const payload = event.body ? JSON.parse(event.body) : {};
            const email = normalizeEmail(payload?.email);
            if (!email) return json(400, { error: "Valid email is required" });

            const customer = await findCustomerByEmail(stripe, email);
            if (!customer) {
                return json(404, { error: "No Stripe customer found for this email" });
            }

            const portal = await stripe.billingPortal.sessions.create({
                customer: customer.id,
                return_url: `${appBaseUrl}/subscriber-studio`,
            });

            return json(200, { portalUrl: portal.url });
        }

        if (normalizedPath.startsWith("webhook") && method === "POST") {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!webhookSecret) {
                return json(503, { error: "Stripe webhook is not configured" });
            }

            const signature = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
            if (!signature) {
                return json(400, { error: "Missing stripe-signature header" });
            }

            try {
                stripe.webhooks.constructEvent(event.body || "", signature, webhookSecret);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Invalid webhook payload";
                return json(400, { error: message });
            }

            return json(200, { received: true });
        }

        return json(404, { error: "Route not found" });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        return json(500, { error: message });
    }
}
