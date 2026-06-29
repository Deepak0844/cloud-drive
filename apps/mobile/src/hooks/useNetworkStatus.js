import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useDispatch } from "react-redux";

// Actions
import { setIsOnline } from "@redux-slices/offlineSlice";

// Service
import syncService from "@services/sync/syncService";
import socketClient from "@services/socketClient";

export function useNetworkStatus() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      dispatch(setIsOnline(online));
      if (online) {
        syncService.drainUploadQueue();
        socketClient.reconnect();
      }
    });
    return unsubscribe;
  }, [dispatch]);
}
