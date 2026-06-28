import FileTransformer from "./fileTransformer";

function normalizeItem(doc = {}) {
  return { ...doc, id: String(doc._id ?? doc.id) };
}

function transformFolderContents(response = {}) {
  const { folders = [], files = [] } = response.data ?? {};
  const normalizedFolders = folders.map((f) => ({ ...normalizeItem(f), type: "folder" }));
  const normalizedFiles = files.map((f) => ({ ...FileTransformer.normalizeItem(f), type: "file" }));
  return {
    folders: normalizedFolders,
    files: normalizedFiles,
    items: [...normalizedFolders, ...normalizedFiles],
    pagination: response.pagination ?? null,
  };
}

function transformFolderList(response = {}) {
  return {
    items: (response.data ?? []).map((f) => ({ ...normalizeItem(f), type: "folder" })),
    pagination: response.pagination ?? null,
  };
}

function transformFolderDetails(response = {}) {
  return normalizeItem(response.data ?? {});
}

const FolderTransformer = { transformFolderContents, transformFolderList, transformFolderDetails };
export default FolderTransformer;
