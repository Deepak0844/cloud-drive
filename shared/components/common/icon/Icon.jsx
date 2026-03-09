import React from "react";
import { Tooltip } from "antd";

// Constants
import { ICON_SIZE } from "@shared-constants/constants";

/**
 * Icon Component
 * @param {Object} props
 * @param {React.ElementType} props.icon - The Lucide-React icon component (e.g., `Eye`, `Trash2`).
 * @param {string} [props.label]
 * @param {string} [props.labelClassName]
 * @param {string} [props.className]
 * @param {string} [props.containerClassName]
 * @param {string} [props.color]
 * @param {number|string} [props.size]
 * @param {number} [props.strokeWidth]
 * @param {string} [props.title] - Used for Tooltip
 * @param {boolean} [props.loading]
 * @param {Function} [props.onClick]
 * @returns {React.ReactNode}
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
    return (
      <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
    );
  }

  return (
    <Tooltip title={title}>
      <span
        className={`cursor-pointer inline-flex items-center ${containerClassName}`}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick(e)}
        role="button"
        tabIndex={0}
      >
        <IconWrapper className={className} color={color} size={iconSize} strokeWidth={strokeWidth} {...rest} />
        {label && <small className={`ml-1 ${labelClassName}`}>{label}</small>}
      </span>
    </Tooltip>
  );
}
