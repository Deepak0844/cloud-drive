// React core & third-party libraries
import React from "react";
import { LoaderCircle } from "lucide-react";

export default function Loader({ size = 16, className = "" }) {
  return <LoaderCircle className={`animate-spin text-muted-foreground ${className}`} size={size} />;
}
