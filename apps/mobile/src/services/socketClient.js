import io from "socket.io-client";

// Config
import Config from "@config";

// Utils
import TokenStorage from "@utils/tokenStorage";

let _socket = null;

async function connect() {
  const token = await TokenStorage.getAccessToken();
  _socket = io(Config.API_SERVICE_URL, {
    auth: { token },
    transports: ["websocket"],
  });
}

function disconnect() {
  _socket?.disconnect();
  _socket = null;
}

function on(event, cb) {
  _socket?.on(event, cb);
}

function off(event, cb) {
  _socket?.off(event, cb);
}

async function reconnect() {
  disconnect();
  await connect();
}

const socketClient = { connect, disconnect, on, off, reconnect };

export default socketClient;
