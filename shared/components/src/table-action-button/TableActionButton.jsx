import { Button, Popconfirm, Tooltip } from "antd";

export default function TableActionButton({
  icon,
  tooltipTitle,
  onClick,
  danger = false,
  type = "default",
  popconfirmTitle,
  onConfirm,
  buttonText,
}) {
  const btn = (
    <Button
      icon={icon}
      onClick={!popconfirmTitle ? onClick : undefined}
      size="small"
      danger={danger}
      type={type}
      ghost={danger}
    >
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
