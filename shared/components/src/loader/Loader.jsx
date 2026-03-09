import { LoaderCircle } from "lucide-react";

// Components
import Icon from "../../common/icon/Icon";

export default function Loader({ size = 16 }) {
  return <Icon icon={LoaderCircle} className="animate-spin" size={size} />;
}
