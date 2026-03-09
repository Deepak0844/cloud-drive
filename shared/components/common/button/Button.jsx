import React from "react";

// Helpers
function constructClassName(disabled, loading, className) {
  const modifierClassName = disabled || loading ? "opacity-50" : "";
  return `btn ${className} ${modifierClassName}`;
}

function IconAndLoader({ loading = false, icon = null, loadingMode = "replace" }) {
  if (!loading) {
    if (icon) {
      return <>{icon}</>;
    }
    return null;
  }

  // loading is true
  if (loadingMode === "combine" && icon) {
    return (
      <span className="d-flex align-items-center gap-1">
        <span className="spinner-border spinner-border-sm" />
        {icon}
      </span>
    );
  }

  // default for replace or only-spinner
  return <span className="spinner-border spinner-border-sm" />;
}

/**
 * Button Component
 * @param {String} className
 * @param {Boolean} disabled
 * @param {Function} onClick
 * @param {Boolean} loading
 * @param {String} iconPosition : start || end
 * @param {React.ElementType} icon
 * @param {String} loadingMode : replace || combine || only-spinner
 * @param {Other Props} rest
 * @returns
 */
export default function Button({
  className = "",
  disabled = false,
  onClick = () => {},
  loading = false,
  iconPosition = "start",
  icon = null,
  loadingMode = "replace",
  children,
  ...rest
}) {
  //
  const btnClassName = constructClassName(disabled, loading, className);

  return (
    <button className={btnClassName} disabled={disabled || loading} onClick={onClick} {...rest}>
      <div className="d-flex gap-2 align-items-center justify-content-center">
        {iconPosition === "start" && <IconAndLoader loading={loading} icon={icon} loadingMode={loadingMode} />}

        {loadingMode !== "only-spinner" && <span>{children}</span>}

        {iconPosition === "end" && <IconAndLoader loading={loading} icon={icon} loadingMode={loadingMode} />}
      </div>
    </button>
  );
}
