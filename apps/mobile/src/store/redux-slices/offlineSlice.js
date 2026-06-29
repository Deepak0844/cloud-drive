import { createSlice } from "@reduxjs/toolkit";

const offlineSlice = createSlice({
  name: "offline",
  initialState: { isOnline: true },
  reducers: {
    setIsOnline: (state, action) => {
      state.isOnline = action.payload;
    },
  },
});

export const { setIsOnline } = offlineSlice.actions;

export default offlineSlice.reducer;
