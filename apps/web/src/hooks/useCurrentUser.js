// Services (RTK Query hooks)
import { useGetMeQuery } from "@services/api/authApi";

// Constants
import { Roles } from "@shared-constants/constants";

/**
 * Server-authoritative hook for the current logged-in user.
 *
 * Wraps the existing `getMe` endpoint and exposes the user's
 * role, name, email, and loading state in a convenient shape.
 *
 * Use this in UI components that need the live, server-verified
 * identity (e.g. Navbar, Sidebar header).
 *
 * NOTE: ProtectedRoute guards must still read from localStorage
 * because React hooks cannot be called in a synchronous guard.
 */
export function useCurrentUser() {
  const { data, isLoading, isError } = useGetMeQuery();

  const user = data?.data ?? null;
  const role = user?.role ?? null;

  return {
    user,
    role,
    isLoading,
    isError,
    isAdmin: role === Roles.ADMIN,
    isUser: role === Roles.USER,
  };
}
