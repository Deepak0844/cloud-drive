import { Button as AntdButton } from "antd";

export default function Button({ children, ...props }) {
  return <AntdButton {...props}>{children}</AntdButton>;
}
