// React core & third-party libraries
import React, { Component } from "react";
import { Typography } from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";

// Components
import Button from "@shared-components/components/button";

// Constants
import PageUrls from "@constants/pageUrls";

const { Title, Text } = Typography;

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
        <div className="min-h-screen w-full flex items-center justify-center bg-surface p-4">
          <div className="max-w-lg w-full bg-white border border-line rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-danger-light text-danger rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm">
              <WarningOutlined />
            </div>

            <Title level={2} className="m-0 mb-3 text-label font-black tracking-tight">
              Something went wrong
            </Title>

            <Text className="text-label-secondary text-base mb-8 block max-w-sm">
              We encountered an unexpected error while loading this page. Our team has been notified.
            </Text>

            {/* eslint-disable-next-line turbo/no-undeclared-env-vars */}
            {import.meta.env.DEV && this.state.error && (
              <div className="w-full bg-surface-dim p-4 rounded-xl border border-line-base mb-8 text-left overflow-hidden">
                <Text type="danger" className="font-mono text-xs font-bold block mb-2 break-all">
                  {this.state.error.toString()}
                </Text>
                <div className="bg-surface p-3 rounded-lg border border-line-base overflow-x-auto">
                  <pre className="text-[10px] text-label-tertiary m-0 font-mono whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
                className="flex-1 h-12 rounded-xl font-bold text-base shadow-primary"
              >
                Reload Page
              </Button>
              <Button
                size="large"
                onClick={this.handleGoHome}
                className="flex-1 h-12 rounded-xl font-bold text-base bg-surface-alt hover:bg-surface-dim border-none text-label"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
