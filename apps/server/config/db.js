import mongoose from "mongoose";

// Config
import EnvConfig from "./env.js";

// Connect to MongoDB
export default function connectToDatabase() {
  mongoose
    .connect(EnvConfig.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
}
