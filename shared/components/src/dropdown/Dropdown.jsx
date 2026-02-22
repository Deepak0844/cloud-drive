import { Dropdown as AntdDropdown } from "antd";

export default function Dropdown({ children, ...props }) {
  return <AntdDropdown {...props}>{children}</AntdDropdown>;
}
