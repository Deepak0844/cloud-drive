// React core & third-party libraries
import PropTypes from "prop-types";
import React from "react";
import { LoaderCircle } from "lucide-react";

export default function Loader({ size = 16, className = "" }) {
  return <LoaderCircle className={`animate-spin text-muted-foreground ${className}`} size={size} />;
}

Loader.propTypes = {
  size: PropTypes.number,
  className: PropTypes.string,
};
