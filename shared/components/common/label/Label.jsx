/**
 * Label Component
 * @param {Boolean} isMandatory
 * @param {String} className
 * @param {Component} children
 * @returns
 */
export default function Label({ isMandatory = false, className = "", children }) {
  return (
    <label className={`mb-1 ${className}`}>
      {children} {isMandatory ? <span className="text-danger required-mark">*</span> : ""}
    </label>
  );
}
