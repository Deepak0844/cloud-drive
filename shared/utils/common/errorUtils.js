/**
 * ---------------------------------------------------------------------
 * getErrorAndStatusCode
 * @param {object} error  : api error
 * @returns object of errorMessage and statusCode
 */
function getErrorAndStatusCode(error = {}) {
  // default error object
  const defaultErrorObject = {
    errorDataString: "",
    statusCode: "",
  };

  const { response = {} } = error;
  const { status = "", data = "" } = response;

  if (response) {
    // status code
    const statusCode = status;

    // error data
    const errorDataString = typeof data === "string" ? data : JSON.stringify(data);

    // return
    return { errorDataString, statusCode };
  }

  // else return default
  return defaultErrorObject;
}

// Exports
// --------------------------------------------------------------------
const ErrorUtils = {
  getErrorAndStatusCode,
};

export default ErrorUtils;
