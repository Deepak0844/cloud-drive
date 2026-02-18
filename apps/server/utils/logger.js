import pino from "pino";

// Config
import Env from "../config/env.js";

// Logger
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
  level: Env.LOG_LEVEL,
});

export default logger;
