import { CircleX } from "lucide-react";

// Components
import { Icon } from "@mavinlabs/react-js-components";

/**
 * Modal Header Component
 * @param {*} title : String
 * @param {*} onClose : Function
 * @returns
 */
export default function ModalHeader({ title = "", onClose = () => {} }) {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center">
        <h4 className="mb-0">{title}</h4>

        <Icon icon={CircleX} title="Close" onClick={onClose} />
      </div>
      <hr />
    </>
  );
}
