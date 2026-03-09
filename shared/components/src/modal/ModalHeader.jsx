import { CircleX } from "lucide-react";

// Components
import Icon from "../../common/icon/Icon";

/**
 * Modal Header Component
 * @param {Object} props
 * @param {String} props.title
 * @param {Function} props.onClose
 * @returns
 */
export default function ModalHeader({ title = "", onClose = () => {} }) {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h4 className="mb-0 text-lg font-bold">{title}</h4>

        <Icon icon={CircleX} title="Close" onClick={onClose} />
      </div>
      <hr className="border-line mb-4" />
    </>
  );
}
