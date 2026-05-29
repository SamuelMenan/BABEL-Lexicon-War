import React from "react";
import { wordHexCore, WORD_TYPE_MAP } from "@game/domains/telemetry/hudUtils.js";
import useTranslation from "@shared/i18n/useTranslation.js";

export default function CombatWordPanel({ activeWord, animState }) {
  const { t } = useTranslation();
  const word = activeWord?.word || "";
  const typed = activeWord?.typed || "";
  const wordType = WORD_TYPE_MAP[word.toLowerCase()] || "LEXEMA";
  const hexCore = word ? wordHexCore(word) : "——";
  const freq = word ? 300 + ((word.charCodeAt(0) * 7 + word.length * 43) % 400) : 0;
  const boxBorderColor = animState === "wrong" ? "#ff2244" : "var(--flow-border, rgba(0,255,204,0.35))";

  let typeKey = "lexeme";
  if (wordType.includes("NOMBRE")) {
    typeKey = "noun";
  } else if (wordType.includes("PROPIO")) {
    typeKey = "proper";
  }
  const translatedWordType = t(`hud.combat.types.${typeKey}`);

  return (
    <div className="combat__word-panel">
      <div className="combat__word-header">
        <span className="combat__word-header-tag">{t("hud.combat.wordHeader")}</span>
        <span className="combat__transmitting" style={{ color: "var(--col-transmitting, var(--col-active))" }}>{t("hud.combat.transmitting")}</span>
      </div>
      <div className="combat__word-box" style={{ borderColor: boxBorderColor }}>
        <span className="combat__word-prompt">&gt;</span>
        <div className="combat__word-letters">
          {word ? (
            word.split("").map((ch, i) => {
              const done = i < typed.length;
              const cur = i === typed.length;
              return (
                <span
                  key={word + i}
                  className={`combat__letter${done ? " letter-hit" : ""}`}
                  style={{
                    color: done ? "var(--col-active)" : cur ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                    textShadow: done ? "0 0 12px var(--col-active)" : "none",
                    borderBottom: cur ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
                  }}
                >
                  {ch}
                </span>
              );
            })
          ) : (
            <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "1.6rem" }}>_ _ _ _ _</span>
          )}
        </div>
      </div>
      <div className="combat__word-meta">
        <span className="combat__meta-tag">{translatedWordType}</span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">{t("hud.combat.nucleus")} · <span style={{ color: "var(--col-meta-val, var(--col-active))" }}>{hexCore}</span></span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">{t("hud.combat.length")} · <span style={{ color: "var(--col-meta-val, var(--col-active))" }}>{word.length || "-"}</span></span>
        <span className="combat__meta-divider">|</span>
        <span className="combat__meta-item">{t("hud.combat.freq")} · <span style={{ color: "var(--col-meta-val, var(--col-active))" }}>{word ? freq + "HZ" : "-"}</span></span>
      </div>
    </div>
  );
}
