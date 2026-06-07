import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import createError from "http-errors";

// Database connection
import connectToDatabase from "#config/db.js";

// Config
import Env from "#config/env.js";

// Constants
import { ErrorMessages } from "#constants/generalConstants.js";
import { HttpStatus } from "@shared-constants/constants";

// Utils
import CronUtils from "#utils/cronUtils.js";
import logger from "#utils/logger.js";
import ResponseUtils from "#utils/responseUtils.js";

// Routes
import authRoutes from "#routes/authRoutes.js";
import fileRoutes from "#routes/fileRoutes.js";
import folderRoutes from "#routes/folderRoutes.js";
import trashRoutes from "#routes/trashRoutes.js";
import quotaRoutes from "#routes/quotaRoutes.js";
import adminRoutes from "#routes/adminRoutes.js";
import itemRoutes from "#routes/itemRoutes.js";
import notificationRoutes from "#routes/notificationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Base URL for API routes
const baseUrl = "/api/v1";

// Connect to MongoDB (skip during testing as tests handle their own connection)
if (Env.NODE_ENV !== "test") {
  connectToDatabase();
}

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'", "http://localhost:*"],
        "upgrade-insecure-requests": null, // Allow http for local development
      },
    },
  })
);

// CORS — restrict to allowed origins (must come before rate limiter so preflight doesn't consume slots)
const allowedOrigins = Env.ALLOWED_ORIGINS
  ? Env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:9001"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Env.NODE_ENV === "production" ? 100 : 2000, // limit each IP to 2000 requests per windowMs in dev/test
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Upload specific limiter (much higher limit for chunked uploads)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40000, // 10000 chunks per 15 min (allows ~100GB per 15 min at 10MB chunk size)
  standardHeaders: true,
  legacyHeaders: false,
  message: "Upload limit reached, please pause and resume later",
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(limiter); // Apply global limiter
app.use(`${baseUrl}/files/upload`, uploadLimiter); // Apply upload-specific limiter

// Logging Middleware (Pino)
function logRequest(req, res, next) {
  logger.info(`${req.method} ${req.url}`);
  next();
}
app.use(logRequest);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/files`, fileRoutes);
app.use(`${baseUrl}/folders`, folderRoutes);
app.use(`${baseUrl}/trash`, trashRoutes);
app.use(`${baseUrl}/quota`, quotaRoutes);
app.use(`${baseUrl}/admin`, adminRoutes);
app.use(`${baseUrl}/items`, itemRoutes);
app.use(`${baseUrl}/notifications`, notificationRoutes);

// Initialize Cron Jobs (skip during testing)
if (Env.NODE_ENV !== "test") {
  CronUtils.initCronJobs();
}

// Base route
app.get("/", (req, res) => {
  ResponseUtils.success(res, { message: "Cloud Drive API is running", version: "0.0.1" });
});

// Health check endpoint
app.get(`${baseUrl}/health`, (req, res) => {
  res.status(HttpStatus.OK).json({ status: "ok", message: "Server is healthy" });
});

// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  next(createError(HttpStatus.NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND));
});

// error handler
app.use((err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || ErrorMessages.SERVER_ERROR;

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack && Env.NODE_ENV !== "production") {
    logger.error(err.stack);
  }

  ResponseUtils.error(res, message, statusCode, {
    ...(Env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
