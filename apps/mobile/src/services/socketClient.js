import io from "socket.io-client";

// Config
import Config from "@config";

// Utils
import TokenStorage from "@utils/tokenStorage";

let _socket = null;
let _listeners = [];

async function connect() {
  if (_socket?.connected) return;
  const token = await TokenStorage.getAccessToken();
  _socket = io(Config.API_SERVICE_URL, {
    auth: { token },
    transports: ["websocket"],
  });
  _listeners.forEach(({ event, cb }) => _socket.on(event, cb));
}

function disconnect() {
  _socket?.disconnect();
  _socket = null;
}

function on(event, cb) {
  _listeners.push({ event, cb });
  _socket?.on(event, cb);
}

function off(event, cb) {
  _listeners = _listeners.filter((l) => !(l.event === event && l.cb === cb));
  _socket?.off(event, cb);
}

function clearListeners() {
  _listeners = [];
}

async function reconnect() {
  disconnect();
  await connect();
}

function isConnected() {
  return Boolean(_socket?.connected);
}

const socketClient = { connect, disconnect, on, off, reconnect, isConnected, clearListeners };

export default socketClient;
