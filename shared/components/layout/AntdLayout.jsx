import { Layout as AntDLayout } from "antd";
const { Content, Header, Footer } = AntDLayout;
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Actions
import { LayoutActions } from "../../slices/layout/layoutSlice";

// Constants
import { AntdLayoutStructureKeys } from "../../constants/layoutConstants";

// Utils
import LayoutUtils from "../../utils/layoutUtils";

// Components
import AntdSidebar from "./AntdSidebar";

// CSS
import "./antd-layout.scss";

/**
 * Layout
 * @param {Array} outletProps
 * @param {Object} leftSidebarConfig
 * @param {Object} rightSidebarConfig
 * @param {Number} topbarHeight
 * @param {Component} topbarContent
 * @param {Component} pageFooterContent
 */
export default function AntdLayout({
  outletProps = {},
  leftSidebarConfig = {},
  rightSidebarConfig = {},
  topbarHeight = 0,
  topbarContent = null,
  pageFooterContent = null,
}) {
  // Dispatch
  const dispatch = useDispatch();

  // Selector State
  const isAntdLeftSidebarCollapsed = useSelector((state) => state.layout.isAntdLeftSidebarCollapsed);
  const isAntdRightSidebarCollapsed = useSelector((state) => state.layout.isAntdRightSidebarCollapsed);

  // Function
  function toggleAntdLeftSidebar(value) {
    dispatch(LayoutActions.toggleAntdLeftSidebar({ isAntdLeftSidebarCollapsed: value }));
  }

  function toggleAntdRightSidebar(value) {
    dispatch(LayoutActions.toggleAntdRightSidebar({ isAntdRightSidebarCollapsed: value }));
  }

  const leftSidebar = (
    <AntdSidebar
      className="antd-left-sider"
      collapsed={isAntdLeftSidebarCollapsed}
      topbarHeight={topbarHeight}
      toggleSidebar={toggleAntdLeftSidebar}
      sidebarConfig={leftSidebarConfig}
    />
  );

  const rightSidebar = (
    <AntdSidebar
      className="antd-right-sider"
      collapsed={isAntdRightSidebarCollapsed}
      topbarHeight={topbarHeight}
      toggleSidebar={toggleAntdRightSidebar}
      sidebarConfig={rightSidebarConfig}
    />
  );

  const topbar = (
    <Header className="p-0 lh-1 text-white" style={{ height: topbarHeight }}>
      {topbarContent}
    </Header>
  );

  const appContent = (
    <AntDLayout className="page">
      <Content>
        <Outlet context={outletProps} />
      </Content>
      {pageFooterContent && <Footer className="p-0">{pageFooterContent}</Footer>}
    </AntDLayout>
  );

  return LayoutUtils.getAntdLayoutStructure(
    AntdLayoutStructureKeys.LEFT_SIDEBAR_TOPBAR_RIGHT_SIDEBAR,
    leftSidebar,
    topbar,
    appContent,
    rightSidebar
  );
}
