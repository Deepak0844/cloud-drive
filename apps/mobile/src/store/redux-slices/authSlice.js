import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { isAuthenticated: false },
  reducers: {
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    resetAuth: (state) => {
      state.isAuthenticated = false;
    },
  },
});

export const { setAuthenticated, resetAuth } = authSlice.actions;
export const AuthReducer = authSlice.reducer;
