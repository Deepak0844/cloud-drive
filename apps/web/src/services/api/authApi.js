import baseApi from "./api";

// utils
import AuthUtils from "@utils/authUtils";

// Socket
import SocketClient from "@services/socketClient";

/**
 * Auth API endpoints injected into the base RTK Query API.
 *
 * It uses AuthUtils for session persistence and HttpClientFactory
 * to ensure the API client is reloaded with the new token after login.
 */
const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/v1/auth/login
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
        onError: { suppressGlobalError: true }, // Let this component handle the error feedback
      }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          AuthUtils.storeUserInfoInLocalStorage(data.data);
        } catch {
          // Error surfaced via the hook
        }
      },
    }),

    // POST /api/v1/auth/register
    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),

    // POST /api/v1/auth/logout
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Even if the server returns an error (e.g. 401 or network error)
          // we still progress to logout the client.
        } finally {
          // Always clear regardless of server response
          AuthUtils.clearSession();
          SocketClient.disconnect(); // Close WebSocket on logout
        }
      },
    }),

    // GET /api/v1/auth/me  — used to get/revalidate the current user
    getMe: builder.query({
      query: () => ({
        url: "/auth/me",
      }),
      providesTags: ["Auth"],
    }),

    // PUT /api/v1/auth/me — used to update the user profile
    updateProfile: builder.mutation({
      query: (body) => ({
        url: "/auth/me",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          AuthUtils.storeUserInfoInLocalStorage(data.data);
        } catch {
          // Handled component level
        }
      },
    }),
    // PUT /api/v1/auth/password — used to change password
    updatePassword: builder.mutation({
      query: (body) => ({
        url: "/auth/password",
        method: "PUT",
        body,
        onError: {
          suppressGlobalError: true,
        },
      }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          AuthUtils.storeUserInfoInLocalStorage(data.data);
        } catch {
          // Handled component level
        }
      },
    }),

    // POST /api/v1/auth/forgot-password — send a password reset email
    forgotPassword: builder.mutation({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
        onError: { suppressGlobalError: true },
      }),
    }),

    // PUT /api/v1/auth/reset-password — set a new password using the reset token
    resetPassword: builder.mutation({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "PUT",
        body,
        onError: { suppressGlobalError: true },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;

export default authApi;
