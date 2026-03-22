import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Utils
import Navigation from "@utils/navigationUtils";

/**
 * Syncs the React Router navigate function with the global navigator.
 */
export default function NavigationSetter() {
  const navigate = useNavigate();

  useEffect(() => {
    Navigation.setGlobalNavigator(navigate);
  }, [navigate]);

  return null;
}
