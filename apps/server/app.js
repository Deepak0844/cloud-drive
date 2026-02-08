import { fileURLToPath } from "url";
import path from "path";
import cookieParser from "cookie-parser";
import express from "express";
import createError from "http-errors";
import logger from "morgan";
import cors from "cors";

// Database connection
import connectToDatabase from "./config/db.js";

// Constants
import StatusCodes from "./constants/statusCodes.js";
import ErrorMessages from "./constants/errorMessages.js";

// Utils
import CronUtils from "./utils/cronUtils.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import folderRoutes from "./routes/folder.routes.js";
import trashRoutes from "./routes/trash.routes.js";
import quotaRoutes from "./routes/quota.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Base URL for API routes
const baseUrl = "/api/v1";

// Connect to MongoDB
connectToDatabase();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(cors());
app.use(logger("dev"));
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

// Initialize Cron Jobs
CronUtils.initCronJobs();

// Base route
app.get("/", (req, res) => {
  res.status(StatusCodes.OK).json({ message: "Cloud Drive API is running", version: "0.0.1" });
});

// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  next(createError(StatusCodes.NOT_FOUND, ErrorMessages.RESOURCE_NOT_FOUND));
});

// error handler
app.use((err, req, res, _next) => {
  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || ErrorMessages.SERVER_ERROR;

  // Log error for debugging
  if (req.app.get("env") === "development") {
    console.error(`[Error] ${statusCode} - ${message}`);
  }

  // Always return JSON for errors in this API-centric server
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(req.app.get("env") === "development" && { stack: err.stack }),
  });
});

export default app;
