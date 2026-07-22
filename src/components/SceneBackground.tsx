import { useEffect, useState } from "react";

/** Dimmed full-viewport background depicting the party's current location.
 *  Hides itself if the scene image hasn't been generated yet. */
export function SceneBackground({
  bookId,
  sceneId,
}: {
  bookId: string;
  sceneId: string | null;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [sceneId]);

  if (!sceneId || broken) return null;
  const src = `${import.meta.env.BASE_URL}art/${bookId}/scenes/${sceneId}.png`;
  return (
    <div className="scene-bg" aria-hidden>
      <img src={src} alt="" onError={() => setBroken(true)} />
      <div className="scene-bg-veil" />
    </div>
  );
}
