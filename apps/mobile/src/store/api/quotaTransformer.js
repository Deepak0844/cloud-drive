function transformQuota(response = {}) {
  return response.data;
}

const QuotaTransformer = { transformQuota };
export default QuotaTransformer;
