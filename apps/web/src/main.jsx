import React from "react";
import { App as AntApp, ConfigProvider } from "antd";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

// store
import { store } from "./store";

// router
import Router from "./routes/Routes";

// error boundary
import GlobalErrorBoundary from "@components/common/GlobalErrorBoundary";

// styles
import "./styles/globals.css";

const themeConfig = {
  token: {
    colorPrimary: "#3b82f6", // --primary
    colorSuccess: "#10b981", // --success
    colorWarning: "#f59e0b", // --warning
    colorError: "#ef4444", // --danger
    colorInfo: "#0ea5e9", // --info
    borderRadius: 12,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      controlHeight: 40,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 24,
    },
    Input: {
      controlHeight: 44,
    },
  },
};

export function App() {
  return (
    <Provider store={store}>
      <GlobalErrorBoundary>
        <ConfigProvider theme={themeConfig}>
          <AntApp>
            <RouterProvider router={Router} />
          </AntApp>
        </ConfigProvider>
      </GlobalErrorBoundary>
    </Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
