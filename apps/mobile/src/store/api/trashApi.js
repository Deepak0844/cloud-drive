// Shared API instance
import { api } from "@rtkQuery/api";

// Constants
import { TrashUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@constants/httpConstants";
import { ApiTagTypes } from "@constants/generalConstants";

// Transformer
import TrashTransformer from "./trashTransformer";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getTrashQuery = () => ({
  query: () => ({ url: TrashUrls.list }),
  transformResponse: TrashTransformer.transformTrashContents,
  providesTags: [ApiTagTypes.TRASH],
});

const restoreItemsMutation = () => ({
  query: ({ items }) => ({
    url: TrashUrls.restore,
    method: HttpMethods.post,
    body: { items },
  }),
  invalidatesTags: [ApiTagTypes.TRASH, ApiTagTypes.FILES, ApiTagTypes.FOLDERS, ApiTagTypes.QUOTA],
});

const permanentlyDeleteItemsMutation = () => ({
  query: ({ items }) => ({
    url: TrashUrls.permanentDelete,
    method: HttpMethods.delete,
    body: { items },
  }),
  invalidatesTags: [ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
});

const emptyTrashMutation = () => ({
  query: () => ({
    url: TrashUrls.empty,
    method: HttpMethods.delete,
  }),
  invalidatesTags: [ApiTagTypes.TRASH, ApiTagTypes.QUOTA],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const trashApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTrash: builder.query(getTrashQuery()),
    restoreItems: builder.mutation(restoreItemsMutation()),
    permanentlyDeleteItems: builder.mutation(permanentlyDeleteItemsMutation()),
    emptyTrash: builder.mutation(emptyTrashMutation()),
  }),
  overrideExisting: false,
});

export const { useGetTrashQuery, useRestoreItemsMutation, usePermanentlyDeleteItemsMutation, useEmptyTrashMutation } =
  trashApi;
