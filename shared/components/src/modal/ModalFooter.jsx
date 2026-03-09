// Components
import Button from "../button/Button";

/**
 * Modal Footer
 * @param {Object} props
 * @param {Function} props.onCancel
 * @param {Function} props.onOk
 * @param {String} props.okText
 * @param {Boolean} props.okLoading
 * @param {String} props.cancelText
 * @returns
 */
export default function ModalFooter({
  onCancel = () => {},
  onOk = () => {},
  okText = "Submit",
  okLoading = false,
  cancelText = "Cancel",
}) {
  return (
    <div className="flex justify-end items-center gap-3 mt-4 pt-4 border-t border-line">
      <Button onClick={onCancel} type="text" className="rounded-xl font-bold">
        {cancelText}
      </Button>

      <Button type="primary" onClick={onOk} loading={okLoading} className="rounded-xl px-6 font-bold shadow-primary">
        {okText}
      </Button>
    </div>
  );
}
