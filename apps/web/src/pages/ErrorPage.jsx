// React core & third-party libraries
import React from "react";
import { useLocation, useNavigate, useRouteError } from "react-router-dom";
import { FileSearch, ShieldAlert, AlertTriangle, Home, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

// Constants
import PageUrls from "@constants/pageUrls";

// Components
import { Button } from "@components/ui/button";

/**
 * Universal Error Page.
 *
 * Displays error details passed via router state, forced props, or useRouteError.
 * Provides a way to return to the home page or login page.
 */
function ErrorPage({ forcedStatus, forcedMessage }) {
  // Router hooks & params
  const location = useLocation();
  const navigate = useNavigate();
  const routeError = useRouteError();

  // Derived / computed variables
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

  // Event handlers
  function handleBack() {
    navigate(PageUrls.DashboardPage, { replace: true });
  }

  function getErrorIcon(code) {
    if (code === 404) return <FileSearch className="text-primary" size={64} />;
    if (code === 403) return <ShieldAlert className="text-warning" size={64} />;
    return <AlertTriangle className="text-error" size={64} />;
  }

  function getStatusType(code) {
    if (code === 404) return "Not Found";
    if (code === 403) return "Access Denied";
    if (code >= 500) return "Server Error";
    return "Something Went Wrong";
  }

  // Render
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-dim p-4 overflow-hidden relative">
      {/* Aurora Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-error/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl bg-surface/60 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/10 p-10 md:p-16 text-center relative z-10"
      >
        <motion.div
          initial={{ rotate: -10, scale: 0.8 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2,
          }}
          className="mx-auto w-24 h-24 rounded-3xl bg-surface-dim flex items-center justify-center mb-10 shadow-inner border border-line/20"
        >
          {getErrorIcon(status)}
        </motion.div>

        <h1 className="text-7xl font-black text-gradient-primary tracking-tighter italic mb-2">{status}</h1>
        <h2 className="text-2xl font-bold text-label mb-6 tracking-tight">{getStatusType(status)}</h2>

        <p className="text-label-tertiary text-lg leading-relaxed mb-12 max-w-md mx-auto font-medium">
          {typeof message === "string" ? message : "An unexpected visual anomaly has occurred in the system."}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="aurora"
            size="pill"
            onClick={handleBack}
            className="w-full sm:w-auto h-14 px-10 italic uppercase tracking-wider"
          >
            <Home size={18} />
            Return to Core
          </Button>
          <Button
            type="text"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto h-14 px-8 rounded-[20px] text-label-tertiary font-bold hover:text-label hover:bg-white/5 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Retry System
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default ErrorPage;
