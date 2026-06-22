import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { isAuthenticated: false, role: null },
  reducers: {
    setAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    resetAuth: (state) => {
      state.isAuthenticated = false;
      state.role = null;
    },
  },
});

export const { setAuthenticated, setRole, resetAuth } = authSlice.actions;
export const AuthReducer = authSlice.reducer;
