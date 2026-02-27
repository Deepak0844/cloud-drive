import fs from "fs";
import { StatusCodes } from "../constants/generalConstants.js";
import ResponseHelper from "../utils/responseHelper.js";

/**
 * Middleware to validate request using Zod schema
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @returns {import('express').RequestHandler}
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) {
      req.body = parsed.body;
    }
    if (parsed.query) {
      req.query = parsed.query;
    }
    if (parsed.params) {
      req.params = parsed.params;
    }

    next();
  } catch (error) {
    if (error.errors) {
      const logContent = `
Time: ${new Date().toISOString()}
Url: ${req.url}
Method: ${req.method}
Errors: ${JSON.stringify(error.errors, null, 2)}
Body: ${JSON.stringify(req.body, null, 2)}
Query: ${JSON.stringify(req.query, null, 2)}
Params: ${JSON.stringify(req.params, null, 2)}
----------------------------------------\n`;
      try {
        fs.appendFileSync("/tmp/validation_error.log", logContent);
      } catch (e) {
        console.error("Failed to write log file:", e.message);
      }
    }
    const message = error.errors ? error.errors[0].message : "Validation error";
    return ResponseHelper.error(res, message, StatusCodes.BAD_REQUEST);
  }
};

export default validate;
