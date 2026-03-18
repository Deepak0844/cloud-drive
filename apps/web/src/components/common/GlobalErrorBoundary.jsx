// React core & third-party libraries
import React, { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { motion } from "framer-motion";

// Components
import Button from "@shared-components/components/button";

// Constants
import PageUrls from "@constants/pageUrls";

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = PageUrls.DashboardPage;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-surface-dim p-4 overflow-hidden relative">
          {/* Aurora Background Effects */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-error/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-warning/5 rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-xl bg-surface/60 backdrop-blur-2xl rounded-[40px] shadow-2xl border border-white/10 p-10 md:p-12 text-center relative z-10"
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
              className="mx-auto w-24 h-24 rounded-3xl bg-error/10 flex items-center justify-center mb-8 shadow-inner border border-error/20"
            >
              <AlertTriangle className="text-error" size={48} />
            </motion.div>

            <h2 className="text-3xl font-black text-label mb-3 tracking-tight">Something went wrong</h2>

            <p className="text-label-secondary text-base mb-8 block max-w-sm mx-auto font-medium">
              We encountered an unexpected error while loading this page. Our team has been notified.
            </p>

            {/* eslint-disable-next-line turbo/no-undeclared-env-vars */}
            {import.meta.env.DEV && this.state.error && (
              <div className="w-full bg-surface-dim p-4 rounded-2xl border border-line/30 mb-8 text-left overflow-hidden shadow-inner">
                <span className="text-error font-mono text-xs font-bold block mb-2 break-all">
                  {this.state.error.toString()}
                </span>
                <div className="bg-surface/50 p-3 rounded-xl border border-line/20 overflow-x-auto">
                  <pre className="text-[10px] text-label-tertiary m-0 font-mono whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Button
                variant="primary"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 h-14 rounded-[20px] font-black text-base shadow-glow hover:scale-[1.03] transition-all flex items-center justify-center gap-2 italic uppercase tracking-wider"
              >
                <RefreshCw size={18} />
                Reload Page
              </Button>
              <Button
                variant="ghost"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto flex-1 h-14 rounded-[20px] font-bold text-base text-label-secondary hover:text-label hover:bg-white/5 flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Go Home
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
