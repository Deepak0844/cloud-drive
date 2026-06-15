const customBaseQuery = () => async (args, api) => {
  const { signal } = api;
  const { sdkFn = null, args: sdkArgs = [], options = {}, onError = {} } = args;

  // Format Error
  function formatError(error) {
    return {
      errorInfo: {
        ...error,
      },
      showToaster: onError.showToaster ?? true,
      showPageError: onError.showPageError ?? false,
      errorPageUrl: onError.errorPageUrl ?? "",
      suppressGlobalError: onError.suppressGlobalError ?? false,
    };
  }

  // SDK Based Call (via sdkFn)
  try {
    const requestOptions = { ...options, signal };
    const result = await sdkFn(...sdkArgs, requestOptions);
    return { data: result };
  } catch (error) {
    return { error: formatError(error) };
  }
};

export default customBaseQuery;
