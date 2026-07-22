import { useEffect, useState } from "react";

/** Full-body illustration for the character's current outfit state. Falls back
 *  to a styled parchment placeholder until the art asset exists. */
export function CharacterArt({
  bookId,
  charId,
  name,
  stateId,
  chapterIndex,
}: {
  bookId: string;
  charId: string;
  name: string;
  stateId: string;
  chapterIndex: number;
}) {
  const src = `${import.meta.env.BASE_URL}art/${bookId}/${charId}/${stateId}.png`;
  const [broken, setBroken] = useState(false);

  // Reset the broken flag whenever the target image changes.
  useEffect(() => setBroken(false), [src]);

  const prettyState = stateId.replace(/^[a-z]+-\d+-/i, "").replace(/-/g, " ");

  return (
    <div className="art-panel">
      <div className="art-frame">
        {!broken ? (
          <img src={src} alt={`${name} — ${prettyState}`} onError={() => setBroken(true)} />
        ) : (
          <div className="art-placeholder">
            <div className="silhouette">{charId === "donut" ? "🐈" : "🧍"}</div>
            <div className="ph-label">{name}</div>
            <div className="ph-note">art pending · “{prettyState}”</div>
          </div>
        )}
      </div>
      <div className="art-caption">
        <span className="name">{name}</span>
        <span>start of Ch {chapterIndex}</span>
      </div>
    </div>
  );
}
