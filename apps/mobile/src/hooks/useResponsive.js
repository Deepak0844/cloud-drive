import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  return {
    isTablet,
    columns: isTablet ? 5 : 3,
    breakpoint: isTablet ? "tablet" : "phone",
  };
}
