import React from "react";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function FlowFrame() {
  const { t } = useTranslation();

  return (
    <div className="flow-frame">
      <div className="flow-frame-corner flow-frame-corner-tl" />
      <div className="flow-frame-corner flow-frame-corner-tr" />
      <div className="flow-frame-corner flow-frame-corner-bl" />
      <div className="flow-frame-corner flow-frame-corner-br" />
      <div className="flow-frame-scan flow-frame-scan-top" />
      <div className="flow-frame-scan flow-frame-scan-bottom" />
      <div className="flow-frame-caption">{t("hud.overlays.flowActive")}</div>
    </div>
  );
}
