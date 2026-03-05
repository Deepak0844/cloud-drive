import { Tooltip } from "antd";

// Constants
import { ICON_SIZE } from "../../constants/constants";

/**
 * Icon Component
 * @param {Component} icon :  The Lucide-React icon component (e.g., `Eye`, `Trash2`).
 * @param {String} label
 * @param {String} labelClassName
 * @param {String} className
 * @param {String} containerClassName
 * @param {String} color
 * @param {Number} size
 * @param {Number} strokeWidth
 * @param {String} title - Used for Tooltip
 * @param {Boolean} loading
 * @param {Function} onClick
 * @returns
 */
export default function Icon({
  icon: IconWrapper,
  label = "",
  labelClassName = "",
  className = "",
  containerClassName = "",
  color = "black",
  size = ICON_SIZE.small,
  strokeWidth = 2,
  title = "",
  loading = false,
  onClick = () => {},
  ...rest
}) {
  //
  const iconSize = ICON_SIZE[size] || size;

  //
  if (!IconWrapper) return null;

  //
  if (loading) {
    return <span className="spinner-border spinner-border-sm" />;
  }

  return (
    <Tooltip title={title}>
      <span
        className={`cursor-pointer ${containerClassName}`}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick(e)}
        role="button"
        tabIndex={0}
      >
        <IconWrapper className={className} color={color} size={iconSize} strokeWidth={strokeWidth} {...rest} />
        {label && <small className={`ms-1 ${labelClassName}`}>{label}</small>}
      </span>
    </Tooltip>
  );
}
