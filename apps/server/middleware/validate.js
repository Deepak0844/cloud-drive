import { StatusCodes } from "../constants/GeneralConstants.js";
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

    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;

    next();
  } catch (error) {
    const message = error.errors ? error.errors[0].message : "Validation error";
    return ResponseHelper.error(res, message, StatusCodes.BAD_REQUEST);
  }
};

export default validate;
