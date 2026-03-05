import { Form, Space } from "antd";

// Components
import { Button } from "@mavinlabs/react-js-components";

/**
 * Modal Footer
 * @param {*} handleReset : Function
 * @param {*} handleSubmit : Function
 * @param {*} upsertBtnText : String
 * @param {*} upsertBtnLoading : Boolean
 * @returns
 */
export default function ModalFooter({
  handleReset = () => {},
  handleSubmit = () => {},
  upsertBtnText = "",
  upsertBtnLoading = false,
}) {
  return (
    <>
      <hr />

      <Form.Item className="d-flex flex-row justify-content-end align-items-center">
        <Space>
          <Button className="btn-secondary" onClick={handleReset}>
            Reset
          </Button>

          <Button className="btn-primary" onClick={handleSubmit} loading={upsertBtnLoading}>
            {upsertBtnText}
          </Button>
        </Space>
      </Form.Item>
    </>
  );
}
