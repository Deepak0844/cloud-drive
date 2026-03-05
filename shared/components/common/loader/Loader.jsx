import { LoaderCircle } from "lucide-react";

// Components
import Icon from "../icon/Icon";

// CSS
import "./Loader.css";

export default function Loader({ size = 16 }) {
  return <Icon icon={LoaderCircle} className="lucide-loader" size={size} />;
}
