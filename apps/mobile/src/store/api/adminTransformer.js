function transformList(response = {}) {
  return { items: response.data ?? [], pagination: response.pagination ?? null };
}

function transformStats(response = {}) {
  return response.data;
}

const AdminTransformer = { transformList, transformStats };
export default AdminTransformer;
