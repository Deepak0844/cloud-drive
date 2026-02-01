export default function Code({ children = null, className = "" }) {
  return <code className={className}>{children}</code>;
}
