/**
 * HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  SERVER_ERROR: 500,
};

/**
 * HTTP Methods
 */
export const HttpMethods = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
};

/**
 * HTTP Headers
 */
export const HttpHeaders = {
  Authorization: "Authorization",
  ContentType: "Content-Type",
  Accept: "Accept",
};

/**
 * HTTP Content Types
 */
export const HttpContentTypes = {
  APP_JSON: "application/json",
  MULTIPART: "multipart/form-data",
};
