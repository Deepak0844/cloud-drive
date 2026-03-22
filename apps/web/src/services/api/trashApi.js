// Utils
import ApiUtils from "./apiUtils";

// Constants
import { TagTypes, TagIds } from "@constants/apiTags";
import { TrashServiceUrls } from "@constants/serviceUrls";
import { HttpMethods } from "@shared-constants/constants/httpConstants";

// Services
import api from "./api";

// ---------------------------------------------------------------------------
// Endpoint Definitions
// ---------------------------------------------------------------------------

const getTrashItemsQuery = () => ({
  query: (params) => ({
    url: TrashServiceUrls.getTrashItems,
    params,
  }),
  serializeQueryArgs: ApiUtils.serializePaginatedQueryArgs,
  merge: ApiUtils.mergePaginatedArrays(),
  providesTags: ApiUtils.listTags(TagTypes.TRASH),
});

const restoreItemsMutation = () => ({
  query: ({ items }) => ({
    url: TrashServiceUrls.restoreItems,
    method: HttpMethods.POST,
    body: { items },
  }),
  invalidatesTags: (result, error) => {
    if (error) return [];
    return [
      TagTypes.FILES,
      TagTypes.FOLDERS,
      ...ApiUtils.listTags(TagTypes.TRASH),
      ...ApiUtils.listTags(TagTypes.FILES),
      ...ApiUtils.listTags(TagTypes.FILES, TagIds.RECENT),
      ...ApiUtils.listTags(TagTypes.FOLDERS),
      ...ApiUtils.listTags(TagTypes.FOLDERS, TagIds.CONTENTS),
      TagTypes.QUOTA,
      TagTypes.ADMIN_STATS,
      TagTypes.ADMIN_USERS,
    ];
  },
});

const permanentlyDeleteItemsMutation = () => ({
  query: ({ items }) => ({
    url: TrashServiceUrls.permanentlyDeleteItems,
    method: HttpMethods.DELETE,
    body: { items },
  }),
  invalidatesTags: [...ApiUtils.listTags(TagTypes.TRASH), TagTypes.QUOTA, TagTypes.ADMIN_STATS, TagTypes.ADMIN_USERS],
});

const emptyTrashMutation = () => ({
  query: () => ({
    url: TrashServiceUrls.emptyTrash,
    method: HttpMethods.DELETE,
  }),
  invalidatesTags: [...ApiUtils.listTags(TagTypes.TRASH), TagTypes.QUOTA, TagTypes.ADMIN_STATS, TagTypes.ADMIN_USERS],
});

// ---------------------------------------------------------------------------
// Inject Endpoints
// ---------------------------------------------------------------------------

export const trashApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTrashItems: builder.query(getTrashItemsQuery()),
    restoreItems: builder.mutation(restoreItemsMutation()),
    permanentlyDeleteItems: builder.mutation(permanentlyDeleteItemsMutation()),
    emptyTrash: builder.mutation(emptyTrashMutation()),
  }),
  overrideExisting: false,
});

export const {
  useGetTrashItemsQuery,
  useRestoreItemsMutation,
  usePermanentlyDeleteItemsMutation,
  useEmptyTrashMutation,
} = trashApi;

export default trashApi;
