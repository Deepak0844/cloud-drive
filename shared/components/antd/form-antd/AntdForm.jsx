import React, { useEffect } from "react";
import { Form } from "antd";

// Component
import { Button } from "@mavinlabs/react-js-components";

// Sections
import FormInput from "./FormInput";

// CSS
import "./form.scss";

// Page Components
function FormSection({ formInputItems = [], isReadMode = false }) {
  return (
    <>
      {formInputItems.map((input = {}) => {
        const { key = "", label = "", inputLayout = "", inputContainerClassName = "col", rules = [] } = input;

        return (
          <div className={inputContainerClassName} key={key}>
            <Form.Item key={key} label={label} name={key} rules={rules} layout={inputLayout}>
              <FormInput input={input} isReadMode={isReadMode} />
            </Form.Item>
          </div>
        );
      })}
    </>
  );
}

/**
 * Antd Form Component
 *
 * @param {object} formInputItems - An array of form input items.
 * @param {object} initialValues - An object containing the initial values of the form.
 * @param {string} formContainerClassName - A class name for the form container.
 * @param {string} footerClassName - A class name for the footer.
 * @param {string} layout - The layout of the form. Can be "horizontal" or "vertical".
 * @param {ReactNode} footer - A React node containing the footer of the form.
 * @param {boolean} loading - A boolean indicating whether the form is loading or not.
 * @param {ReactNode} requiredMark - A React node containing the required mark of the form.
 * @param {function} formSubmit - A function to be called when the form is submitted.
 * @param {function} onChange - A function to be called when the form values change.
 * @param {function} onValuesChange - A function to be called when the form values change.
 * @param {boolean} isReadMode - A boolean indicating whether the form is in read mode or not.
 */
export default function AntdForm({
  formInputItems = [],
  initialValues = {},
  formContainerClassName = "",
  footerClassName = "",
  layout = "vertical",
  footer = null,
  loading = false,
  requiredMark = null,
  formSubmit = () => {},
  onChange = () => {},
  onValuesChange = () => {},
  isReadMode = false,
  ...rest
}) {
  // Form
  const [form] = Form.useForm();

  const showFormActionButton = footer === null && !isReadMode;

  // useEffect
  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  return (
    <Form
      className={`${isReadMode ? "ant-form-readonly" : ""} ${formContainerClassName}`}
      initialValues={initialValues}
      layout={layout}
      form={form}
      onFinish={formSubmit}
      onValuesChange={onValuesChange}
      requiredMark={requiredMark}
      {...rest}
    >
      {formInputItems.map((formGroup = {}, index) => {
        const { title = "", titleClassName = "", containerClassName = "row", inputItems = [] } = formGroup;

        return (
          <div key={index}>
            {title && <label className={`${titleClassName} mb-1`}>{title}</label>}

            <div className={`${containerClassName} g-3`}>
              <FormSection onChange={onChange} formInputItems={inputItems} form={form} isReadMode={isReadMode} />
            </div>
          </div>
        );
      })}

      {showFormActionButton && (
        <div className={`text-end ${footerClassName}`}>
          <Button type="reset" className="btn-secondary me-2" onClick={() => form.resetFields()} disabled={loading}>
            Reset
          </Button>

          <Button type="submit" className="btn-primary" loading={loading} disabled={loading}>
            Submit
          </Button>
        </div>
      )}

      {footer && React.cloneElement(footer, { form })}
    </Form>
  );
}
