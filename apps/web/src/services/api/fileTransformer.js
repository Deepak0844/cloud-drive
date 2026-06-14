function normalizeItem(doc = {}) {
  return { ...doc, id: String(doc._id ?? doc.id) };
}

function transformFileList(response) {
  return {
    items:      (response.data ?? []).map(normalizeItem),
    pagination: response.pagination ?? null,
  };
}

function transformFile(response) {
  return normalizeItem(response.data ?? {});
}

const FileTransformer = { transformFileList, transformFile };
export default FileTransformer;
