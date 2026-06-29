import socketClient from "@services/socketClient";
import { api } from "@rtkQuery/api";

const FILE_FOLDER_EVENTS = ["file:created", "file:deleted", "file:updated", "folder:created", "folder:deleted"];

let _bound = false;

export const socketMiddleware = (store) => (next) => (action) => {
  if (!_bound && action.type === "@@INIT") {
    _bound = true;
    socketClient.connect().then(() => {
      FILE_FOLDER_EVENTS.forEach((event) =>
        socketClient.on(event, () => store.dispatch(api.util.invalidateTags(["FILES", "FOLDERS"])))
      );
    });
  }
  return next(action);
};
