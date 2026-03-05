import { Link } from "react-router-dom";

/**
 * Logo Component
 * @param {String} redirectURL
 * @param {String} containerClassName
 * @param {Number} imageHeight
 * @param {String} imageURL
 * @returns
 */
export default function Logo({ redirectURL = "", containerClassName = "", imageHeight = 40, imageURL = "" }) {
  return (
    <div className={containerClassName}>
      <Link to={redirectURL ? redirectURL : ""}>
        <img src={imageURL} alt="Logo" height={imageHeight} />
      </Link>
    </div>
  );
}
