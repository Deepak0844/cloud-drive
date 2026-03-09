import { Modal as AntDModal } from "antd";

// Components
import ModalFooter from "./ModalFooter";
import ModalHeader from "./ModalHeader";

/**
 * Modal Component
 * @param {*} forceRender : Boolean
 * @param {*} open : Boolean
 * @param {*} modalTitle : String
 * @param {*} modalWidth : Integer
 * @param {*} modalStyle : Object
 * @param {*} btnText : String
 * @param {*} btnLoading : Boolean
 * @param {*} handleReset : Function
 * @param {*} handleSubmit : Function
 * @param {*} handleCloseModal : Function
 * @param {*} children
 * @returns
 */
export default function Modal({
  forceRender = false,
  open = false,
  modalTitle = "",
  modalWidth = 600,
  modalStyle = {},
  btnText = "Submit",
  btnLoading = false,
  cancelText = "Cancel",
  handleReset = () => {}, // Re-using handleReset for onAfterClose if needed, but primarily onCancel
  handleSubmit = () => {},
  handleCloseModal = () => {},
  children,
}) {
  return (
    <AntDModal
      open={open}
      title={null}
      width={modalWidth}
      style={modalStyle}
      afterClose={handleReset}
      forceRender={forceRender}
      closable={false}
      footer={() => (
        <ModalFooter
          onCancel={handleCloseModal}
          onOk={handleSubmit}
          okText={btnText}
          okLoading={btnLoading}
          cancelText={cancelText}
        />
      )}
      className="premium-modal"
      centered
    >
      {modalTitle && <ModalHeader title={modalTitle} onClose={handleCloseModal} />}

      <div className="modal-content-wrapper min-h-[100px]">{children}</div>
    </AntDModal>
  );
}
