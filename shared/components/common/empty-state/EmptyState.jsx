import { Dropdown } from "antd";
import { ChevronDown } from "lucide-react";

// Components
import Icon from "../icon/Icon";
import Button from "../button/Button";

// Css
import "./EmptyState.css";

export default function EmptyState({
  title = "",
  subTitle = "",
  iconSource = "",
  btnIcon,
  btnLabel = "",
  btnLoading,
  btnSubmit = () => {},
  isDropDownButton = false,
  menuOptions = {},
  className = "",
}) {
  return (
    <div className={`d-flex flex-column align-items-center  ${className}`}>
      {iconSource && <img className="icon-source me-1" src={iconSource} alt="Add" />}

      {title && <h3 className="fw-semibold mt-3">{title} </h3>}

      {subTitle && <p className="my-2">{subTitle}</p>}

      {btnLabel && !isDropDownButton && (
        <Button
          className="btn-primary px-2"
          icon={btnIcon}
          loading={btnLoading}
          disabled={btnLoading}
          onClick={btnSubmit}
        >
          {btnLabel}
        </Button>
      )}

      {isDropDownButton && (
        <div>
          <Dropdown.Button
            icon={<Icon icon={ChevronDown} size="small" />}
            menu={menuOptions}
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            {btnLabel}
          </Dropdown.Button>
        </div>
      )}
    </div>
  );
}
