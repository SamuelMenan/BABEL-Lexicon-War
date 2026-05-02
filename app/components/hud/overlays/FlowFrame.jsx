import React from "react";

export default function FlowFrame() {
  return (
    <div className="flow-frame">
      <div className="flow-frame-corner flow-frame-corner-tl" />
      <div className="flow-frame-corner flow-frame-corner-tr" />
      <div className="flow-frame-corner flow-frame-corner-bl" />
      <div className="flow-frame-corner flow-frame-corner-br" />
      <div className="flow-frame-scan flow-frame-scan-top" />
      <div className="flow-frame-scan flow-frame-scan-bottom" />
      <div className="flow-frame-caption">FLUJO · LEX · ACTIVO</div>
    </div>
  );
}
