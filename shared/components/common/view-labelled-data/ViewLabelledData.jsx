import { Tooltip } from "antd";

// Page Components
function DataView({ dataArray = [], isVertical = false }) {
  return dataArray.map((data = {}, index) => {
    const { label = "", value = "", className = "col-3" } = data;

    const isArray = Array.isArray(value);

    return (
      <div key={index} className={`mb-3 ${isVertical ? "row" : className}`}>
        <label className={`light ${isVertical ? "col-2" : ""}`}>{label}</label>

        <Tooltip title={value}>
          <div className={`fw-semibold text-truncate  ${isVertical ? "col-10" : ""}`}>
            {isArray && (value.join(", ") || "--")}

            {!isArray && (value || "--")}
          </div>
        </Tooltip>
      </div>
    );
  });
}

/**
 * View Labeled Data Component
 * @param {Array} viewDataArray : [{ title: "", dataArray: [{ label: String, value: String }]}, ...]
 * @param {String} className
 * @param {Boolean} isVertical
 */
export default function ViewLabelledData({ viewDataArray = [], className = "", isVertical = false }) {
  return viewDataArray.map((section = {}, index) => {
    const { title = "", dataArray = [] } = section;

    return (
      <div key={index} className={`row ${className}`}>
        {title && <p className="text-muted fs-5">{title}</p>}
        <DataView dataArray={dataArray} isVertical={isVertical} className="row-cols-3" />
      </div>
    );
  });
}
