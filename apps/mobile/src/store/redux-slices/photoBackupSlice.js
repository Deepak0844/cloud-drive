import { createSlice } from "@reduxjs/toolkit";

const photoBackupSlice = createSlice({
  name: "photoBackup",
  initialState: {
    enabled: false,
    wifiOnly: true,
    chargingOnly: false,
    lastBackupTimestamp: null,
  },
  reducers: {
    setBackupEnabled: (state, { payload }) => {
      state.enabled = payload;
    },
    setWifiOnly: (state, { payload }) => {
      state.wifiOnly = payload;
    },
    setChargingOnly: (state, { payload }) => {
      state.chargingOnly = payload;
    },
    setLastBackupTimestamp: (state, { payload }) => {
      state.lastBackupTimestamp = payload;
    },
  },
});

export const { setBackupEnabled, setWifiOnly, setChargingOnly, setLastBackupTimestamp } = photoBackupSlice.actions;

export default photoBackupSlice.reducer;
