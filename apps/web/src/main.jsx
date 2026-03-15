// React core & third-party libraries
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

// Store
import { store } from "./store";

// Router
import Router from "./routes/Routes";

// Error boundary
import GlobalErrorBoundary from "@components/common/GlobalErrorBoundary";

// Styles
import "./styles/globals.css";

export function App() {
  return (
    <Provider store={store}>
      <GlobalErrorBoundary>
        <RouterProvider router={Router} />
      </GlobalErrorBoundary>
    </Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
