import { useNavigate } from "react-router-dom";

// api
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from "../store/api/authApi";

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
   * Login Function
   */
  async function login(credentials, redirectTo = "/", options = {}) {
    try {
      await loginMutation({ ...credentials, ...options }).unwrap();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Errors are handled by the component using the mutation state
      console.error("Login hook error:", err);
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
