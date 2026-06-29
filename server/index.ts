import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Handle URL rewriting for '/api/election-predictor' prefix
// This MUST run before route registration
app.use((req, _res, next) => {
  // Some platform proxies prepend '/api/election-predictor' to this app.
  // Normalize those requests so existing '/api/*' routes keep working.
  const originalUrl = req.originalUrl || req.url;
  const originalPath = req.path;
  
  console.log(`[MIDDLEWARE] Incoming ${req.method} ${originalUrl} (path: ${originalPath})`);
  
  // Check if the request path starts with /api/election-predictor/
  if (originalPath.startsWith("/api/election-predictor/")) {
    // Strip the prefix
    const newPath = originalPath.slice("/api/election-predictor".length); // Keep the leading /
    req.url = newPath + (req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "");
    console.log(`[PREFIX-STRIP] SUCCESS: ${originalPath} -> ${newPath}`);
  } else {
    console.log(`[PREFIX-STRIP] SKIPPED: path does not start with /api/election-predictor/`);
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  // Use the processed URL for logging  
  const path = req.url.split('?')[0];
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
