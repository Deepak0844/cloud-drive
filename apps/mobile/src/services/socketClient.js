import io from "socket.io-client";

// Config
import Config from "@config";

// Utils
import { TokenStorage } from "@utils/tokenStorage";

let _socket = null;

export const socketClient = {
  async connect() {
    const token = await TokenStorage.getAccessToken();
    _socket = io(Config.API_SERVICE_URL, {
      auth: { token },
      transports: ["websocket"],
    });
  },

  disconnect() {
    _socket?.disconnect();
    _socket = null;
  },

  on(event, cb) {
    _socket?.on(event, cb);
  },

  off(event, cb) {
    _socket?.off(event, cb);
  },

  async reconnect() {
    this.disconnect();
    await this.connect();
  },
};
