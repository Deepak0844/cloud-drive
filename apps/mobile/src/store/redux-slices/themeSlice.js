import { createSlice } from "@reduxjs/toolkit";

const themeSlice = createSlice({
  name: "theme",
  initialState: { colorMode: "system" },
  reducers: {
    setColorMode: (state, action) => {
      state.colorMode = action.payload;
    },
  },
});

export const { setColorMode } = themeSlice.actions;
export const ThemeReducer = themeSlice.reducer;
