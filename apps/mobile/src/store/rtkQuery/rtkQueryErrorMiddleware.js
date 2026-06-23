import { isRejectedWithValue } from "@reduxjs/toolkit";

// Actions
import { ErrorActions } from "@redux-slices/errorSlice";

/**
 * RTK Query Global Error Middleware
 */
export function rtkQueryErrorMiddleware(store) {
  return (next) => (action) => {
    if (isRejectedWithValue(action)) {
      const { originalArgs = {} } = action.meta.arg;
      const errorPayload = action.payload || {};
      const suppressGlobalError = originalArgs.suppressGlobalError ?? errorPayload.suppressGlobalError ?? false;

      if (!suppressGlobalError) {
        const status = errorPayload.status;
        if (status === "NETWORK_ERROR" || status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
          store.dispatch(ErrorActions.setNetworkError());
        } else {
          const message = errorPayload.data?.message ?? "Something went wrong";
          store.dispatch(ErrorActions.setError({ errorInfo: { message } }));
        }
      }
    }

    return next(action);
  };
}
