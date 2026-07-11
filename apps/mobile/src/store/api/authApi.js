// Shared API instance
import { api } from "@rtkQuery/api";

// Constants
import { AuthUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Redux
import { setAuthenticated, setRole, resetAuth } from "@redux-slices/authSlice";

// Utils
import TokenStorage from "@utils/tokenStorage";
import { TimeUtils } from "@shared-utils/utils";

// Db
import itemsRepository from "@db/repositories/itemsRepository";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function handleAuthSuccess({ data }, dispatch, delayMs = 0) {
  const { accessToken, refreshToken, user } = data.data;
  if (!accessToken || !refreshToken || !user) return;
  await TokenStorage.setAccessToken(accessToken);
  await TokenStorage.setRefreshToken(refreshToken);
  await TokenStorage.setRole(user.role);
  if (delayMs > 0) {
    await TimeUtils.delay(delayMs);
  }
  // A previous session's cached queries (getMe, quota, files…) must not leak
  // into the newly-authenticated identity.
  dispatch(api.util.resetApiState());
  dispatch(setAuthenticated(true));
  dispatch(setRole(user.role));
}

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const loginMutation = () => ({
  query: (credentials) => ({
    url: AuthUrls.login,
    method: HttpMethods.post,
    body: credentials,
    skipAuthRetry: true,
    suppressGlobalError: true,
  }),
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      const result = await queryFulfilled;
      await handleAuthSuccess(result, dispatch, 1000);
    } catch {
      // login failed — leave state untouched
    }
  },
});

const registerMutation = () => ({
  query: (userData) => ({
    url: AuthUrls.register,
    method: HttpMethods.post,
    body: userData,
    skipAuthRetry: true,
    suppressGlobalError: true,
  }),
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      const result = await queryFulfilled;
      await handleAuthSuccess(result, dispatch);
    } catch {
      // registration failed — leave state untouched
    }
  },
});

const logoutMutation = () => ({
  queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
    const refreshToken = await TokenStorage.getRefreshToken();
    return baseQuery({
      url: AuthUrls.logout,
      method: HttpMethods.post,
      skipAuthRetry: true,
      suppressGlobalError: true,
      ...(refreshToken && { headers: { "X-Refresh-Token": refreshToken } }),
    });
  },
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      await queryFulfilled;
      await TokenStorage.clearTokens();
      await itemsRepository.clearAll().catch(() => {});
      dispatch(api.util.resetApiState());
      dispatch(resetAuth());
    } catch {
      // logout request failed — leave local session intact so user can retry
    }
  },
});

const getMeQuery = () => ({
  query: () => ({ url: AuthUrls.me, method: HttpMethods.get }),
  transformResponse: (response) => response.data,
  providesTags: [ApiTagTypes.USERS],
});

const updateProfileMutation = () => ({
  query: (update) => ({ url: AuthUrls.me, method: HttpMethods.put, body: update }),
  invalidatesTags: [ApiTagTypes.USERS],
});

const updatePasswordMutation = () => ({
  query: (body) => ({
    url: AuthUrls.changePassword,
    method: HttpMethods.put,
    body,
    suppressGlobalError: true,
  }),
});

const refreshTokenMutation = () => ({
  query: () => ({ url: AuthUrls.refresh, method: HttpMethods.post }),
});

const forgotPasswordMutation = () => ({
  query: (body) => ({
    url: AuthUrls.forgotPassword,
    method: HttpMethods.post,
    body,
    skipAuthRetry: true,
    suppressGlobalError: true,
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
    refreshToken: builder.mutation(refreshTokenMutation()),
    forgotPassword: builder.mutation(forgotPasswordMutation()),
  }),
  overrideExisting: false,
});

// Export Hooks
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
} = authApi;
