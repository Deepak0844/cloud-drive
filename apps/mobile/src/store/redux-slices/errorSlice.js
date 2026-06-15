import { createSlice } from "@reduxjs/toolkit";

//initial state
const initialState = {
  error: false,
  networkError: false,
  message: null,
};

const errorSlice = createSlice({
  name: "Error",
  initialState,
  reducers: {
    setError: (state, action) => {
      state.error = true;
      state.message = action.payload?.errorInfo?.message ?? "Something went wrong";
    },

    setNetworkError: (state) => {
      state.networkError = true;
      state.message = "No internet connection";
    },

    reset: () => initialState,
  },
});

// Reducer
export const ErrorReducer = errorSlice.reducer;

// Actions
export const ErrorActions = errorSlice.actions;
