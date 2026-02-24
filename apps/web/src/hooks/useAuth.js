import { useNavigate } from "react-router-dom";

// api
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from "../store/api/authApi";

// utils
import AuthUtils from "../utils/authUtils";

// constants
import PageUrls from "../constants/pageUrls";
import { Roles } from "../constants/generalConstants";

/**
 * Custom hook for Authentication related actions.
 * Centralizes login, logout, and registration with redirection logic.
 */
export function useAuth() {
  const navigate = useNavigate();

  // Mutations
  const [loginMutation, { isLoading: isLoginLoading, isError: isLoginError, error: loginError }] = useLoginMutation();
  const [logoutMutation, { isLoading: isLogoutLoading, isError: isLogoutError }] = useLogoutMutation();
  const [registerMutation, { isLoading: isRegisterLoading, isError: isRegisterError, error: registerError }] =
    useRegisterMutation();

  /**
   * Login Function.
   * After a successful login, reads the stored role and navigates to the
   * correct default page for that role. Admins → /admin, users → /my-files.
   * If the user was redirected here from a protected route, they go back there
   * (only for regular users; admins always land on their dashboard).
   */
  async function login(credentials, redirectTo = PageUrls.MyFilesPage, options = {}) {
    try {
      await loginMutation({ ...credentials, ...options }).unwrap();

      // Role is now stored in localStorage by authApi's onQueryStarted
      const role = AuthUtils.getUserRole();
      if (role === Roles.ADMIN) {
        navigate(PageUrls.AdminPage, { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      // Errors are surfaced via the hook's isLoginError / loginError state
      console.error("Login hook error:", err);
      throw err; // Re-throw so the page component can catch it
    }
  }

  /**
   * Register Function
   */
  async function register(userData, options = {}) {
    try {
      await registerMutation({ ...userData, ...options }).unwrap();
      // Redirect to login after successful registration
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Register hook error:", err);
    }
  }

  /**
   * Logout Function
   */
  async function logout() {
    try {
      await logoutMutation().unwrap();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout hook error:", err);
    }
  }

  return {
    login,
    logout,
    register,
    isLoginLoading,
    isLogoutLoading,
    isRegisterLoading,
    isLoginError,
    isLogoutError,
    isRegisterError,
    loginError,
    registerError,
  };
}
