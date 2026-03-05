import Plot from "react-plotly.js";

// Utils & Constants
import ChartLayoutUtils from "../utils/chartLayoutUtils";
import ChartTracesUtils from "../utils/chartTraceUtils";
import { DEFAULT_CONFIG, CHART_THEME_TYPES } from "../constants/chartConstants";

/**
 * Plotly Extended Component
 * @param {Array} data - Data for the chart
 * @param {Object} chartConfig - Additional chart configuration
 * @param {Object} columnConfig - Column-specific configuration
 * @param {string} theme - Theme for the chart
 * @param {number} width - Chart width
 * @param {number} height - Chart height
 * @param {boolean} showTitle - Whether to display the chart title
 * @param {Object} xAxis - X-axis configuration overrides
 * @param {Object} yAxis - Y-axis configuration overrides
 * @param {Object} config - Plotly configuration
 * @param {Object} layout - Additional layout configuration
 * @param {string} className - Additional CSS class
 */
export default function PlotlyExtended({
  // Data props
  rows = [],
  chartConfig = {},
  columnConfig = {},

  // Chart configuration
  theme = CHART_THEME_TYPES.PRIMARY,

  // Layout props
  width = 1000,
  height = 500,
  showTitle = true,
  showlegend = true,

  // Axis configuration
  xAxis = {},
  yAxis = {},

  // Plotly configuration
  config = {},
  layout = {},

  // Styling
  className = "",
}) {
  // Construct chart traces
  const chartTraces = ChartTracesUtils.constructChartTraces(chartConfig, rows, columnConfig, theme);

  if (!Array.isArray(chartTraces) || !chartTraces.length) {
    return (
      <div
        style={{
          height: `${500}px`,
          width: `${1000}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <p>No data available to display the chart</p>
      </div>
    );
  }

  // Construct chart layout
  const chartLayout = ChartLayoutUtils.constructChartLayout({ ...chartConfig, showlegend }, theme, showTitle);

  // Merge custom layout and axis configurations
  const finalLayout = {
    ...chartLayout,
    ...layout,
    width,
    height,
    xaxis: {
      ...chartLayout.xaxis,
      ...xAxis,
    },
    yaxis: {
      ...chartLayout.yaxis,
      ...yAxis,
    },
  };

  // Merge custom config with defaults
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return <Plot data={chartTraces} className={className} layout={finalLayout} config={finalConfig} />;
}
