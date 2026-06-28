function transformNotifications(response = {}) {
  return response.data ?? [];
}

const NotificationTransformer = { transformNotifications };
export default NotificationTransformer;
