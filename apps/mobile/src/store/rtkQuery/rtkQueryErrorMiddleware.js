import { isRejectedWithValue } from "@reduxjs/toolkit";

// Actions
import { ErrorActions } from "@redux-slices/errorSlice";

/**
 * RTK Query Global Error Middleware
 */
export function rtkQueryErrorMiddleware(store) {
  return (next) => (action) => {
    // Catch all RTK Query rejected actions
    if (isRejectedWithValue(action)) {
      const { originalArgs = {} } = action.meta.arg;
      const errorPayload = action.payload || {};

      // Get flags (Priority: Hook Args > Endpoint Payload )
      const suppressGlobalError = originalArgs.suppressGlobalError ?? errorPayload.suppressGlobalError ?? false;

      // Dispatch to the existing global error slice
      if (!suppressGlobalError) {
        const { errorInfo = {} } = errorPayload || {};
        store.dispatch(
          ErrorActions.setError({
            errorInfo: errorInfo,
          })
        );
      }
    }

    return next(action);
  };
}
