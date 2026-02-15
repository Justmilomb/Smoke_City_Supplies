import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { UPLOADS_DIR } from "./upload";
import { pool } from "./db";
import "./auth"; // Passport strategies
import { securityHeaders, corsConfig } from "./security";

const PgSession = connectPgSimple(session);
const MemSessionStore = createMemoryStore(session);

const app = express();

// Serve uploaded images
app.use("/uploads", express.static(UPLOADS_DIR));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Security headers (apply to all routes)
app.use(securityHeaders);
app.use(corsConfig);

// Session (required for Passport) — use PostgreSQL when DATABASE_URL set, else in-memory for local dev
const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-in-production";
const sessionStore = pool
  ? new PgSession({ pool, tableName: "session", createTableIfMissing: true })
  : new MemSessionStore({ checkPeriod: 86400000 });

if (!pool) {
  console.log("[server] Running locally without DATABASE_URL — using in-memory storage and session store.");
}

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

// Passport
import passport from "passport";
app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
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

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // On Render, PORT is set automatically.
  // Default to 5000 for Replit, else 3000 for local dev (avoids common macOS port conflicts).
  const defaultPort = process.env.REPL_ID ? "5000" : "3000";
  const port = parseInt(process.env.PORT || defaultPort, 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on http://0.0.0.0:${port}`);
  });
})();
