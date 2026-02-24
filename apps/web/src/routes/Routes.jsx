import { Outlet, createBrowserRouter } from "react-router-dom";

// Constants
import PageUrls from "@/constants/pageUrls";

// Routes
import { MainRoutes } from "./MainRoutes";

// HOC
import PublicRoute from "@/components/hoc/PublicRoute";

// Pages
import LoginPage from "@/pages/login/LoginPage";
import RegisterPage from "@/pages/register/RegisterPage";
import ErrorPage from "@/pages/error/ErrorPage";

// Utils
import NavigationSetter from "@/utils/NavigationSetter";

function Root() {
  return (
    <>
      <NavigationSetter />
      <Outlet />
    </>
  );
}

/**
 * Main Router Configuration.
 */
const Router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      MainRoutes,

      {
        path: PageUrls.LoginPage,
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },

      {
        path: PageUrls.RegisterPage,
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },

      {
        path: PageUrls.ErrorPage,
        element: <ErrorPage />,
      },

      // Catch-all route for 404s
      {
        path: "*",
        element: <ErrorPage forcedStatus={404} forcedMessage="Oops! The page you're looking for doesn't exist." />,
      },
    ],
  },
]);

export default Router;
