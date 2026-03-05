import { Tag } from "antd";

// Constants
import { STATUS, TAG_COLOR } from "../../constants/statusConstants";

// Components
import { Loader } from "@mavinlabs/react-js-components";

/**
 * Status Tag Component
 * @param {*} loading : Boolean
 * @param {*} isActive : Boolean
 * @returns
 */
export default function StatusTag({ loading = false, isActive = false }) {
  const statusText = isActive ? STATUS.ACTIVE : STATUS.IN_ACTIVE;
  const tagColor = isActive ? TAG_COLOR.GREEN : TAG_COLOR.RED;

  return (
    <div className="tag-wrapper d-flex justify-content-center">
      {loading && <Loader size={18} />}

      {!loading && (
        <Tag className="d-flex justify-content-center align-items-center" color={tagColor}>
          {statusText}
        </Tag>
      )}
    </div>
  );
}
