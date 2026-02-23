import baseApi from "./baseApi";

// utils
import AuthUtils from "@/utils/authUtils";
import HttpClientFactory from "@/utils/httpClientFactory";

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
      }),
      async onQueryStarted(_args, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          AuthUtils.storeUserInfoInLocalStorage(data.data);
          HttpClientFactory.reload();
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
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Even if the server returns an error (e.g. 401 or network error)
          // we still progress to logout the client.
        } finally {
          // Always clear regardless of server response
          AuthUtils.clearSession();
          HttpClientFactory.reset();

          // Reset all cached RTK Query data
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    // GET /api/v1/auth/me  — used to get/revalidate the current user
    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetMeQuery } = authApi;

export default authApi;
