import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Constants
import { ICON_SIZE } from "@shared-constants/constants";

// Components
import Icon from "../icon/Icon";

/**
 * Back Arrow Component
 * Navigates to previous page or given previousPageUrl
 * @param {String} previousPageUrl
 * @param {Number} size
 * @returns
 */
export default function BackArrow({ previousPageUrl = "", size = ICON_SIZE.medium }) {
  // Navigate
  const navigate = useNavigate();

  // Function to Handle Navigation
  function handleNavigate() {
    if (previousPageUrl) {
      navigate(previousPageUrl);
    } else {
      navigate(-1);
    }
  }

  return <Icon icon={ChevronLeft} size={size} title={"back"} onClick={handleNavigate} />;
}
