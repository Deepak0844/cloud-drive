import { useEffect, useRef } from "react";

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
