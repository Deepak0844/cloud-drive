import { useGetMeQuery } from "@api/authApi";
import { Roles } from "@shared-constants";

export function useIsAdmin() {
  const { data: me } = useGetMeQuery();
  return me?.role === Roles.ADMIN;
}
