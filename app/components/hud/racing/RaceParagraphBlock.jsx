import React from "react";

export default function RaceParagraphBlock({
  currentPhrase,
  currentPhraseWordIndex,
  activeWord,
  animState,
  playerPhrasesCompleted,
  totalPhrases,
}) {
  if (!currentPhrase) return null;
  const typed = activeWord?.typed || "";

  return (
    <div className="r-paragraph-block">
      <div className="r-paragraph-head">
        <span className="r-paragraph-head__tag">◊ TRANSMISION · ACTIVA</span>
        <span className="r-paragraph-head__progress">
          <span className="r-ph-num">{playerPhrasesCompleted || 0}</span>
          <span className="r-ph-sep">/</span>
          <span className="r-ph-total">{totalPhrases || "?"}</span>
        </span>
      </div>
      <div className={`r-paragraph${animState === "wrong" ? " r-paragraph--error" : ""}`}>
        {currentPhrase.map((word, wi) => {
          if (wi < currentPhraseWordIndex) {
            return (
              <React.Fragment key={wi}>
                <span className="r-pc r-pc--done">{word}</span>{" "}
              </React.Fragment>
            );
          }
          if (wi === currentPhraseWordIndex) {
            return (
              <React.Fragment key={wi}>
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
                })}{" "}
              </React.Fragment>
            );
          }
          return (
            <React.Fragment key={wi}>
              <span className="r-pc r-pc--pending">{word}</span>{" "}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
