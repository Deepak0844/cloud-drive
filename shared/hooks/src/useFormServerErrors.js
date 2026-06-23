import { useEffect, useRef } from "react";

/**
 * Maps server-side field errors from an API response onto a react-hook-form instance.
 *
 * @param {object|null} error - RTK Query or fetch error object with a `.data` shape.
 * @param {Function} setError - react-hook-form `setError` callback.
 * @param {object}   [options={}]
 * @param {string}   [options.fallbackField="root"] - Form field that receives the error when no per-field errors are present.
 * @param {object}   [options.fieldMap={}]          - Maps server field names to form field names (e.g. `{ username: "email" }`).
 */
export function useFormServerErrors(error, setError, { fallbackField = "root", fieldMap = {} } = {}) {
  const fieldMapRef = useRef(fieldMap);
  fieldMapRef.current = fieldMap;

  useEffect(() => {
    if (!error?.data) return;

    const serverErrors = error.data.errors;
    const message =
      error.data.message ??
      error.data.error?.message ??
      (typeof error.data === "string" ? error.data : null) ??
      "Something went wrong. Please try again.";

    if (Array.isArray(serverErrors) && serverErrors.length > 0) {
      serverErrors.forEach(({ field, message: fieldMessage }) => {
        setError(fieldMapRef.current[field] ?? field, { type: "server", message: fieldMessage });
      });
    } else {
      setError(fallbackField, { type: "server", message });
    }
  }, [error, setError, fallbackField]);
}
