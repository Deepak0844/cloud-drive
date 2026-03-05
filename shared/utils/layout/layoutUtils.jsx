import { Layout } from "antd";

// Constants
import { AntdLayoutStructureKeys } from "../constants/layoutConstants";

function getAntdLayoutStructure(
  layoutId = "",
  leftSidebar = null,
  topbar = null,
  appContent = null,
  rightSidebar = null
) {
  switch (layoutId) {
    case AntdLayoutStructureKeys.LEFT_SIDEBAR_TOPBAR_RIGHT_SIDEBAR:
      // Left sidebar | Topbar above content | Right sidebar
      return (
        <Layout>
          {leftSidebar}
          <Layout>
            {topbar}
            {appContent}
          </Layout>
          {rightSidebar}
        </Layout>
      );

    case AntdLayoutStructureKeys.TOPBAR_LEFT_SIDEBAR_RIGHT_SIDEBAR_BELOW:
      // Topbar | Below: Left sidebar + Content + Right sidebar
      return (
        <Layout>
          {topbar}
          <Layout>
            {leftSidebar}
            {appContent}
            {rightSidebar}
          </Layout>
        </Layout>
      );

    case AntdLayoutStructureKeys.LEFT_SIDEBAR_TOPBAR_BELOW_RIGHT_SIDEBAR:
      // Left sidebar | Topbar below sidebar | Right sidebar next to content
      return (
        <Layout>
          {leftSidebar}
          <Layout>
            {topbar}
            <Layout>
              {appContent}
              {rightSidebar}
            </Layout>
          </Layout>
        </Layout>
      );

    case AntdLayoutStructureKeys.TOPBAR_BELOW_LEFT_SIDEBAR_RIGHT_SIDEBAR:
      // Topbar | Below: Left sidebar + Content | Right sidebar outside
      return (
        <Layout>
          <Layout>
            {topbar}
            <Layout>
              {leftSidebar}
              {appContent}
            </Layout>
          </Layout>
          {rightSidebar}
        </Layout>
      );

    default:
      return appContent;
  }
}

// Layout Utils -------------------------------------------
const LayoutUtils = {
  getAntdLayoutStructure,
};

// export default
export default LayoutUtils;
