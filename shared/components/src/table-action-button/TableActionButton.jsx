import { Popconfirm, Tooltip } from "antd";
import Button from "../button/Button";

export default function TableActionButton({
  icon,
  tooltipTitle,
  onClick,
  variant = "outline",
  popconfirmTitle,
  onConfirm,
  buttonText,
}) {
  const btn = (
    <Button icon={icon} onClick={!popconfirmTitle ? onClick : undefined} size="sm" variant={variant}>
      {buttonText}
    </Button>
  );

  let wrappedBtn = btn;

  if (popconfirmTitle && onConfirm) {
    wrappedBtn = (
      <Popconfirm title={popconfirmTitle} onConfirm={onConfirm} okText="Yes" cancelText="No">
        {btn}
      </Popconfirm>
    );
  }

  if (tooltipTitle) {
    return <Tooltip title={tooltipTitle}>{wrappedBtn}</Tooltip>;
  }

  return wrappedBtn;
}
