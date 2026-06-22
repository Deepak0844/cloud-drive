// Shared API instance
import { api } from "@rtkQuery/api";

// Constants
import { AuthUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";

// Redux
import { setAuthenticated, setRole, resetAuth } from "@redux-slices/authSlice";

// Utils
import { TokenStorage } from "@utils/tokenStorage";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const loginMutation = () => ({
  query: (credentials) => ({
    url: AuthUrls.login,
    method: HttpMethods.post,
    body: credentials,
  }),
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      const { accessToken, refreshToken, user } = data.data;
      await TokenStorage.setAccessToken(accessToken);
      await TokenStorage.setRefreshToken(refreshToken);
      await TokenStorage.setRole(user.role);
      dispatch(setAuthenticated(true));
      dispatch(setRole(user.role));
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
  }),
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      const { data } = await queryFulfilled;
      const { accessToken, refreshToken, user } = data.data;
      await TokenStorage.setAccessToken(accessToken);
      await TokenStorage.setRefreshToken(refreshToken);
      await TokenStorage.setRole(user.role);
      dispatch(setAuthenticated(true));
      dispatch(setRole(user.role));
    } catch {
      // registration failed — leave state untouched
    }
  },
});

const logoutMutation = () => ({
  query: () => ({ url: AuthUrls.logout, method: HttpMethods.post }),
  async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
    try {
      await queryFulfilled;
    } finally {
      await TokenStorage.clearTokens();
      dispatch(resetAuth());
    }
  },
});

const getMeQuery = () => ({
  query: () => ({ url: AuthUrls.me, method: HttpMethods.get }),
});

const updateProfileMutation = () => ({
  query: (update) => ({ url: AuthUrls.me, method: HttpMethods.put, body: update }),
});

const refreshTokenMutation = () => ({
  query: () => ({ url: AuthUrls.refresh, method: HttpMethods.post }),
});

const forgotPasswordMutation = () => ({
  query: (body) => ({ url: AuthUrls.forgotPassword, method: HttpMethods.post, body }),
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
  useRefreshTokenMutation,
  useForgotPasswordMutation,
} = authApi;
