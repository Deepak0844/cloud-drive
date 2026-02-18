import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import createError from "http-errors";

// Database connection
import connectToDatabase from "./config/db.js";

// Config
import Env from "./config/env.js";

// Constants
import { ErrorMessages, StatusCodes } from "./constants/generalConstants.js";

// Utils
import CronUtils from "./utils/cronUtils.js";
import logger from "./utils/logger.js";
import ResponseHelper from "./utils/responseHelper.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import trashRoutes from "./routes/trash.routes.js";
import quotaRoutes from "./routes/quota.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import itemRoutes from "./routes/item.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

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

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Upload specific limiter (much higher limit for chunked uploads)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // 2000 chunks per 15 min
  message: "Upload limit reached, please pause and resume later",
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(cors());
app.use(limiter); // Apply global limiter
app.use(`${baseUrl}/files/upload`, uploadLimiter); // Apply upload-specific limiter

// Logging Middleware (Pino)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
  ResponseHelper.success(res, { message: "Cloud Drive API is running", version: "0.0.1" });
});

// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  next(createError(StatusCodes.NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND));
});

// error handler
app.use((err, req, res, _next) => {
  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || ErrorMessages.SERVER_ERROR;

  // Log error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack && Env.NODE_ENV !== "production") {
    logger.error(err.stack);
  }

  ResponseHelper.error(res, message, statusCode, {
    ...(Env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
