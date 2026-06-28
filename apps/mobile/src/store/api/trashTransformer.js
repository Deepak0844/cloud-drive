function normalizeItem(doc = {}) {
  return { ...doc, id: String(doc._id ?? doc.id) };
}

function transformTrashContents(response = {}) {
  const { folders = [], files = [] } = response.data ?? {};
  return {
    folders: folders.map((f) => ({ ...normalizeItem(f), type: "folder" })),
    files: files.map((f) => ({ ...normalizeItem(f), type: "file" })),
    pagination: response.pagination ?? null,
  };
}

const TrashTransformer = { transformTrashContents, normalizeItem };
export default TrashTransformer;
