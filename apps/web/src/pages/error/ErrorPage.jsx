import { Result } from "antd";
import { motion } from "framer-motion";
import React from "react";
import { useLocation, useNavigate, useRouteError } from "react-router-dom";

// constants
import PageUrls from "@constants/pageUrls";

// components
import Button from "@shared-components/components/button";

/**
 * Universal Error Page.
 *
 * Displays error details passed via router state, forced props, or useRouteError.
 * Provides a way to return to the home page or login page.
 */
function ErrorPage({ forcedStatus, forcedMessage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeError = useRouteError();

  // Resolution priority:
  // 1. Forced props (from wildcard routes)
  // 2. location.state (from manual redirects/middleware)
  // 3. routeError (from errorElement catches)
  // 4. Fallback defaults
  const status = forcedStatus || location.state?.status || routeError?.status || 500;

  const message =
    forcedMessage ||
    location.state?.message ||
    routeError?.statusText ||
    routeError?.message ||
    "An unexpected error occurred. Please try again later.";

  const handleBack = () => {
    navigate(PageUrls.DashboardPage, { replace: true });
  };

  const getStatusType = (code) => {
    if (code === 404) return "404";
    if (code === 403) return "403";
    if (code === 500 || code >= 500) return "500";
    return "error";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-secondary p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-surface rounded-4xl shadow-xl border border-line-base p-8 md:p-12 text-center"
      >
        <Result
          status={getStatusType(status)}
          title={status}
          subTitle={
            <div className="mt-4">
              <p className="text-foreground-secondary text-lg leading-relaxed">
                {typeof message === "string" ? message : JSON.stringify(message)}
              </p>
            </div>
          }
          extra={[
            <Button
              key="home"
              type="primary"
              onClick={handleBack}
              className="h-12 px-8 rounded-2xl text-base font-medium transition-all hover:scale-105 active:scale-95"
            >
              Back to Home
            </Button>,
          ]}
        />
      </motion.div>
    </div>
  );
}

export default ErrorPage;
