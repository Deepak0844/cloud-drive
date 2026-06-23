// React core & third-party libraries
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Services (RTK Query hooks)
import { useLoginMutation, useLogoutMutation, useRegisterMutation } from "@services/api/authApi";

// Constants
import PageUrls from "@constants/pageUrls";
import { Roles } from "@shared-constants/constants";

// Utils
import AuthUtils from "@utils/authUtils";
import { TimeUtils } from "@shared-utils/utils";

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

  const [loginSuccess, setLoginSuccess] = useState(false);

  /**
   * Login Function.
   * On success, shows a toast, waits 1 seconds, then navigates based on role.
   */
  async function login(credentials, redirectTo = PageUrls.MyFilesPage, options = {}) {
    await loginMutation({ ...credentials, ...options }).unwrap();
    setLoginSuccess(true);
    await TimeUtils.delay(1000);
    const role = AuthUtils.getUserRole();
    if (role === Roles.ADMIN) {
      navigate(PageUrls.AdminPage, { replace: true });
    } else {
      navigate(redirectTo, { replace: true });
    }
  }

  /**
   * Register Function
   */
  async function register(userData, options = {}) {
    await registerMutation({ ...userData, ...options }).unwrap();
    navigate(PageUrls.LoginPage, { replace: true });
  }

  /**
   * Logout Function
   */
  async function logout() {
    try {
      await logoutMutation().unwrap();
      navigate(PageUrls.LoginPage, { replace: true });
    } catch (_err) {
      // Errors are surfaced via the hook's isLogoutError state
    }
  }

  return {
    login,
    logout,
    register,
    loginSuccess,
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
