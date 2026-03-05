import { Layout, Menu } from "antd";
import { useNavigate } from "react-router-dom";
const { Sider } = Layout;

/**
 * Antd Sidebar
 * @param {String} className
 * @param {Boolean} collapsed
 * @param {Function} toggleSidebar
 * @param {Number} topbarHeight
 * @param {Object} sidebarConfig
 */
export default function AntdSidebar({
  className = "",
  collapsed = false,
  toggleSidebar = () => {},
  topbarHeight = 0,
  sidebarConfig = {},
}) {
  const {
    isSidebarPresent = false,
    isSidebarCollapsible = false,
    showMenuNameOnCollapse = false,
    width = 320,
    collapsedWidth = 72,
    menuMode = "inline",
    footer = null,
    isTriggerPresent = "",
    items = [],
    reverseArrow = false,
    collapsedLogoUrl = "",
    logoUrl = "",
    logoHeight = 40,
    logoRedirectUrl = "/",
  } = sidebarConfig;

  const logoContainerClassName = !topbarHeight ? "mt-2" : "";

  // Navigate
  const navigate = useNavigate();

  const imageUrl = collapsed ? collapsedLogoUrl : logoUrl;

  // Function
  function navigateToPage({ key = "" }) {
    navigate(key);
  }

  if (!isSidebarPresent) {
    return null;
  }

  return (
    <Sider
      className={className}
      collapsible={isSidebarCollapsible}
      collapsed={collapsed}
      onCollapse={toggleSidebar}
      width={width}
      collapsedWidth={collapsedWidth}
      trigger={isTriggerPresent}
      reverseArrow={reverseArrow}
    >
      <div className="sidebar-wrapper">
        {imageUrl && (
          <div
            className={`sider-header d-flex align-items-center justify-content-center ${logoContainerClassName}`}
            style={{ height: topbarHeight || "auto" }}
          >
            <div
              onClick={() => navigate(logoRedirectUrl)}
              onKeyDown={(e) => e.key === "Enter" && navigate(logoRedirectUrl)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label="Go to home"
            >
              <img height={logoHeight} src={imageUrl} alt="Logo" />
            </div>
          </div>
        )}

        <div className="sider-menu-scroll">
          <Menu
            defaultSelectedKeys={["1"]}
            mode={menuMode}
            items={items}
            className={showMenuNameOnCollapse ? "" : "hide-menu-names"}
            getPopupContainer={(triggerNode) => triggerNode.closest(`.${className}`)}
            onClick={navigateToPage}
          />
        </div>

        {footer && <div className="sider-footer">{footer}</div>}
      </div>
    </Sider>
  );
}
