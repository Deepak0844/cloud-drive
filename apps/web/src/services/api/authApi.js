// Utils
import AuthUtils from "@utils/authUtils";
import SocketClient from "@services/socketClient";

// Constants
import { TagTypes } from "@constants/apiTags";
import { AuthServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const loginMutation = () => ({
  query: (credentials) => ({
    url: AuthServiceUrls.login,
    method: HttpMethods.POST,
    body: credentials,
    onError: { suppressGlobalError: true },
  }),
  transformResponse: (res) => res.data,
  async onQueryStarted(_args, { queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      AuthUtils.storeUserInfoInLocalStorage(data);
    } catch {
      // Error surfaced via the hook
    }
  },
});

const registerMutation = () => ({
  query: (userData) => ({
    url: AuthServiceUrls.register,
    method: HttpMethods.POST,
    body: userData,
  }),
});

const logoutMutation = () => ({
  query: () => ({
    url: AuthServiceUrls.logout,
    method: HttpMethods.POST,
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
      SocketClient.disconnect();
    }
  },
});

const getMeQuery = () => ({
  query: () => ({
    url: AuthServiceUrls.getMe,
  }),
  transformResponse: (res) => res.data,
  providesTags: [TagTypes.AUTH],
});

const updateProfileMutation = () => ({
  query: (body) => ({
    url: AuthServiceUrls.updateProfile,
    method: HttpMethods.PUT,
    body,
  }),
  transformResponse: (res) => res.data,
  invalidatesTags: [TagTypes.AUTH],
  async onQueryStarted(_args, { queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      AuthUtils.storeUserInfoInLocalStorage(data);
    } catch {
      // Handled component level
    }
  },
});

const updatePasswordMutation = () => ({
  query: (body) => ({
    url: AuthServiceUrls.updatePassword,
    method: HttpMethods.PUT,
    body,
    onError: {
      suppressGlobalError: true,
    },
  }),
  transformResponse: (res) => res.data,
  invalidatesTags: [TagTypes.AUTH],
  async onQueryStarted(_args, { queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      AuthUtils.storeUserInfoInLocalStorage(data);
    } catch {
      // Handled component level
    }
  },
});

const forgotPasswordMutation = () => ({
  query: (body) => ({
    url: AuthServiceUrls.forgotPassword,
    method: HttpMethods.POST,
    body,
    onError: { suppressGlobalError: true },
  }),
});

const resetPasswordMutation = () => ({
  query: (body) => ({
    url: AuthServiceUrls.resetPassword,
    method: HttpMethods.PUT,
    body,
    onError: { suppressGlobalError: true },
  }),
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation(loginMutation()),
    register: builder.mutation(registerMutation()),
    logout: builder.mutation(logoutMutation()),
    getMe: builder.query(getMeQuery()),
    updateProfile: builder.mutation(updateProfileMutation()),
    updatePassword: builder.mutation(updatePasswordMutation()),
    forgotPassword: builder.mutation(forgotPasswordMutation()),
    resetPassword: builder.mutation(resetPasswordMutation()),
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
