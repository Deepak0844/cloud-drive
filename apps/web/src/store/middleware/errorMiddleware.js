import { isRejectedWithValue } from "@reduxjs/toolkit";
import { toast } from "sonner";

// Utils
import AuthUtils from "@utils/authUtils";
import Navigation from "@utils/navigationUtils";

// Constants
import PageUrls from "@constants/pageUrls";

/**
 * Global RTK Query Error Middleware.
 */
export default function rtkQueryErrorMiddleware(api) {
  return (next) => (action) => {
    if (isRejectedWithValue(action)) {
      const {
        status,
        data,
        showToast: payloadShowToast,
        showPageError: payloadShowPageError,
        suppressGlobalError: payloadSuppressGlobalError,
      } = action.payload;
      const originalArgs = action.meta?.arg?.originalArgs;

      // Config values: Payload flags take precedence, then originalArgs, then defaults
      const suppressGlobalError = payloadSuppressGlobalError ?? originalArgs?.suppressGlobalError ?? false;
      const showToast = payloadShowToast ?? originalArgs?.showToast ?? false; // Default to redirect for all >= 400
      const showPageError = payloadShowPageError ?? originalArgs?.showPageError ?? true; // Default to redirect/page error

      // 1. Handle 401 Unauthorized globally (always reset session)
      if (status === 401) {
        AuthUtils.clearSession();
        api.dispatch({ type: "api/resetApiState" });

        if (!suppressGlobalError) {
          Navigation.globalNavigate(PageUrls.LoginPage, { replace: true });
          return next(action);
        }
      }

      // 2. Universal Redirection for all other errors (status >= 400)
      if (status >= 400 && showPageError && !suppressGlobalError) {
        // Look for common error keys in the response data, prioritizing specific message strings
        const errorMessage =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          (typeof data === "string" ? data : null) ||
          "An unexpected error occurred.";

        Navigation.globalNavigate(PageUrls.ErrorPage, {
          state: { status, message: errorMessage },
          replace: true,
        });
        return next(action);
      }

      // 3. Show Toaster (Notification) if explicitly requested OR fallback
      if (showToast && !suppressGlobalError) {
        const errorMessage =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          (typeof data === "string" ? data : null) ||
          "An unexpected error occurred.";

        toast.error(`Error ${status || ""}`, {
          description: errorMessage,
          duration: 4000,
        });
      }
    }
    return next(action);
  };
}
