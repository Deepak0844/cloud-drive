import socketClient from "@services/socketClient";
import { api } from "@rtkQuery/api";

// Constants
import { ApiTagTypes } from "@constants/generalConstants";

// Actions
import { setAuthenticated, resetAuth } from "@redux-slices/authSlice";

// Server socket event → RTK Query tags to invalidate (names match SocketEvents
// in the server's constants/generalConstants.js).
const EVENT_TAG_MAP = {
  FILE_CHANGE: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA],
  FOLDER_CHANGE: [ApiTagTypes.FOLDERS, ApiTagTypes.FILES],
  ITEM_BULK_CHANGE: [ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
  QUOTA_UPDATE: [ApiTagTypes.QUOTA],
  notification: [ApiTagTypes.NOTIFICATIONS],
};

let _bound = false;

async function connectAndBind(store) {
  if (_bound) return;
  _bound = true;
  await socketClient.connect();
  Object.entries(EVENT_TAG_MAP).forEach(([event, tags]) => {
    socketClient.on(event, () => store.dispatch(api.util.invalidateTags(tags)));
  });
}

function teardown() {
  _bound = false;
  socketClient.disconnect();
  socketClient.clearListeners();
}

export const socketMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (setAuthenticated.match(action)) {
    if (action.payload) {
      connectAndBind(store);
    } else {
      teardown();
    }
  } else if (resetAuth.match(action)) {
    teardown();
  }

  return result;
};
