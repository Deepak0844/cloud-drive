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
  btnText = "",
  btnLoading = false,
  handleReset = () => {},
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
          handleReset={handleReset}
          handleSubmit={handleSubmit}
          upsertBtnText={btnText}
          upsertBtnLoading={btnLoading}
        />
      )}
    >
      {modalTitle && <ModalHeader title={modalTitle} onClose={handleCloseModal} />}

      {children}
    </AntDModal>
  );
}
