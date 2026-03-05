/**
 * Antd Menu Icon
 * @param {*} Icon : Component
 * @param {*} size
 */
export default function AntdMenuIcon({ Icon, size = 16 }) {
  return (
    <div className="antd-collapsed-menu-icon">
      <Icon size={size} />
    </div>
  );
}
