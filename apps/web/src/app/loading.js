// external
import { CloudServerOutlined } from "@ant-design/icons";
import React from "react";

function Loading() {
  return (
    <div className="fixed inset-0 bg-surface-dim flex flex-col items-center justify-center z-50">
      <div className="text-6xl text-primary mb-6 animate-bounce">
        <CloudServerOutlined />
      </div>
      <div className="text-xl font-bold text-gradient-primary animate-pulse">Loading Cloud Drive...</div>
    </div>
  );
}

export default Loading;
