import React from "react";

export default function RacePhrase({ currentPhrase, currentPhraseWordIndex, activeWord, animState }) {
  if (!currentPhrase) return null;
  const typed = activeWord?.typed || "";

  return (
    <div className="race__phrase-zone">
      <div className={"word-area-" + animState + " race__phrase-words"}>
        {currentPhrase.map((word, wi) => {
          if (wi < currentPhraseWordIndex) {
            return <span key={wi} className="race__phrase-done">{word}</span>;
          }
          if (wi === currentPhraseWordIndex) {
            return (
              <span key={wi} className="race__phrase-active">
                {word.split("").map((ch, ci) => (
                  <span
                    key={ci}
                    style={{
                      color: ci < typed.length ? "var(--col-active)" : ci === typed.length ? "var(--col-pending)" : "var(--col-ghost-letter)",
                      textShadow: ci < typed.length ? "0 0 12px var(--col-active)" : "none",
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            );
          }
          return <span key={wi} className="race__phrase-upcoming">{word}</span>;
        })}
      </div>
    </div>
  );
}
