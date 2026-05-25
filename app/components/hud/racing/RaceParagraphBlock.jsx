import React, { useRef, useEffect, useState, useCallback } from "react";
import useTranslation from "../../../../shared/i18n/useTranslation.js";

const LINE_HEIGHT_PX = 44; // debe coincidir con font-size * line-height en CSS

export default function RaceParagraphBlock({
  wordBuffer,
  globalWordIndex,
  activeWord,
  animState,
  wordsCompleted,
}) {
  const { t } = useTranslation();
  const activeRef   = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const lastLineRef = useRef(0);

  // Cuando cambia la palabra activa, mira si salto de linea
  const measureScroll = useCallback(() => {
    const el = activeRef.current;
    if (!el) return;
    const top = el.offsetTop;
    if (top !== lastLineRef.current) {
      lastLineRef.current = top;
      setOffsetY(top);
    }
  }, []);

  useEffect(() => {
    measureScroll();
  }, [globalWordIndex, measureScroll]);

  if (!wordBuffer || wordBuffer.length === 0) return null;

  const typed = activeWord?.typed || "";

  return (
    <div className="r-paragraph-block">
      <div className="r-paragraph-head">
        <span className="r-paragraph-head__tag">{t("hud.racing.transmissionActive")}</span>
        <span className="r-paragraph-head__progress">
          <span className="r-ph-num">{wordsCompleted || 0}</span>
          <span className="r-ph-sep"> {t("hud.common.words")}</span>
        </span>
      </div>

      <div className={`r-paragraph${animState === "wrong" ? " r-paragraph--error" : ""}`}>
        <div
          className="r-paragraph__inner"
          style={{ transform: `translateY(-${offsetY}px)` }}
        >
          {wordBuffer.map((word, wi) => {
            const isDone   = wi < globalWordIndex;
            const isActive = wi === globalWordIndex;

            if (isActive) {
              return (
                <span key={wi} ref={activeRef} className="r-word r-word--active">
                  {word.split("").map((ch, ci) => {
                    let cls = "r-pc ";
                    if (ci < typed.length) {
                      cls += typed[ci] === ch ? "r-pc--done" : "r-pc--error";
                    } else if (ci === typed.length) {
                      cls += "r-pc--cursor";
                    } else {
                      cls += "r-pc--pending";
                    }
                    return <span key={ci} className={cls}>{ch}</span>;
                  })}
                </span>
              );
            }

            return (
              <span
                key={wi}
                className={`r-word ${isDone ? "r-word--done" : "r-word--pending"}`}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
