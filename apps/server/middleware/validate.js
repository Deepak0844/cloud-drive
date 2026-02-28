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
    const message = error.errors ? error.errors[0].message : "Validation error";
    return ResponseHelper.error(res, message, StatusCodes.BAD_REQUEST);
  }
};

export default validate;
