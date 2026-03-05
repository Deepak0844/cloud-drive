import { Input, InputNumber, Select, DatePicker } from "antd";
const { RangePicker } = DatePicker;

// Constnats
import { BooleanSelectOptions, InputTypeKeyMap } from "./FormConstants";

/**
 * Form Input Component
 *
 * @param {object} input - An object containing the properties of the form input.
 * @param {boolean} isReadMode - A boolean indicating whether the form is in read mode or not.
 * @param {boolean} isTabularForm - A boolean indicating whether the form is a tabular form or not.
 * @param {boolean} isFormDisabled - A boolean indicating whether the form is disabled or not.
 * @param {function} onChange - A function to be called when the form input value changes.
 * @param {function} formInputChange - A function to be called when the form input value changes.
 *
 * @returns A React node containing the form input component.
 */
export default function FormInput({
  input = {},
  isReadMode = false,
  isTabularForm = false,
  onChange = () => {},
  formInputChange = () => {},
  ...rest
}) {
  // Input
  const {
    disabled = false,
    type = "",
    placeholder = "",
    isNegativeAllowed = false,
    options = [],
    datePickerOptions = {},
  } = input;

  /**
   * Picker Options : https://ant.design/components/date-picker#api:~:text=4%2E5%2E0-,picker
   * Time Options : https://ant.design/components/date-picker#api:~:text=showTime,-To
   */
  const { showTime = false, rangePickerType = "date", timeOptions = {} } = datePickerOptions;

  // If its add form it will show placeholder, otherwise it will check in the data for value, if value is not there, it will give "--"
  const placeholderText = isTabularForm ? "" : isReadMode ? "--" : placeholder;

  function handleChange(e) {
    onChange(e);
    formInputChange(e);
  }

  if (type === InputTypeKeyMap.select || type === InputTypeKeyMap.booleanSelect) {
    return (
      <Select
        placeholder={placeholderText}
        options={type === InputTypeKeyMap.booleanSelect ? BooleanSelectOptions : options}
        disabled={disabled}
        className="w-100"
        onChange={handleChange}
        {...rest}
      />
    );
  }

  if (type === InputTypeKeyMap.multiSelect) {
    return (
      <Select
        mode="multiple"
        showSearch={true}
        optionFilterProp="label"
        className="w-100"
        placeholder={placeholderText}
        options={options}
        disabled={disabled}
        onChange={handleChange}
        {...rest}
      />
    );
  }

  if (type === InputTypeKeyMap.date) {
    return <DatePicker className="w-100" showTime={showTime ? timeOptions : false} onChange={handleChange} {...rest} />;
  }

  if (type === InputTypeKeyMap.dateRangePicker) {
    return (
      <RangePicker
        className="w-100"
        showTime={showTime ? timeOptions : false}
        picker={rangePickerType}
        onChange={handleChange}
        {...rest}
      />
    );
  }

  if (type === InputTypeKeyMap.textarea) {
    return (
      <Input.TextArea
        className="w-100"
        placeholder={placeholderText}
        disabled={disabled}
        onChange={handleChange}
        {...rest}
      />
    );
  }

  if (type === InputTypeKeyMap.number) {
    return (
      <InputNumber
        className="w-100"
        placeholder={placeholderText}
        disabled={disabled}
        onChange={handleChange}
        min={isNegativeAllowed ? "" : 0}
        {...rest}
      />
    );
  }

  return (
    <Input className="w-100" placeholder={placeholderText} disabled={disabled} onChange={handleChange} {...rest} />
  );
}
