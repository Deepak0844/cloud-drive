// Third-party modules
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Models
import User from "#models/User.js";

// Config
import config from "#config/env.js";

// Constants
import { Roles } from "@shared-constants/constants";

// Utils
import logger from "#utils/logger.js";

let io = null;

/**
 * Initialize Socket.io with the provided HTTP server
 * @param {http.Server} server - The HTTP server instance
 * @returns {Server} - The initialized socket.io server instance
 */
function init(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        logger.warn("Socket connection rejected: No token");
        return next(new Error("Authentication error: No token"));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      const userId = String(decoded.id);

      // Fetch user to confirm existence and role
      const user = await User.findById(userId);
      if (!user) {
        logger.warn(`Socket connection rejected: User ${userId} not found`);
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = userId;
      socket.userRole = user.role;
      next();
    } catch (err) {
      logger.error("Socket Auth Error:", err.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const uId = socket.userId;
    logger.info(`🔌 Current socket: ${socket.id} joined as User: ${uId} (Role: ${socket.userRole})`);

    // Join individual room (ID as string)
    socket.join(uId);

    // Join admin room if applicable
    if (socket.userRole === Roles.ADMIN) {
      socket.join("admins");
      logger.info(`👨‍💼 Admin joined room: admins`);
    }

    socket.on("error", (err) => {
      logger.error(`Socket error for user ${uId}:`, err);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`❌ Socket disconnected: ${uId} (Reason: ${reason})`);
    });
  });

  return io;
}

/**
 * Send event to a specific room or user
 * @param {string} room - Room or user ID room name
 * @param {string} event - Event name to emit
 * @param {any} data - Data to send with the event
 */
function emitToRoom(room, event, data) {
  if (io) {
    const roomName = String(room);
    logger.debug(`📤 Emitting ${event} to room: ${roomName}`);
    io.to(roomName).emit(event, data);
  }
}

/**
 * Send event to a specific user
 * @param {string} userId - ID of the user to send the event to
 * @param {string} event - Event name to emit
 * @param {any} data - Data to send with the event
 */
function emitToUser(userId, event, data) {
  emitToRoom(String(userId), event, data);
}

/**
 * Send event to all admins
 * @param {string} event - Event name to emit
 * @param {any} data - Data to send with the event
 */
function emitToAdmins(event, data) {
  emitToRoom("admins", event, data);
}

// Exports
const SocketService = {
  init,
  emitToRoom,
  emitToUser,
  emitToAdmins,
};

export default SocketService;
