import type { CharacterRef } from "../schema";

/** Spoiler-safe: only characters who have joined the party by `chapterIndex`
 *  are passed in as `visible`. */
export function CharacterTabs({
  visible,
  activeId,
  onSelect,
}: {
  visible: CharacterRef[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {visible.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={c.id === activeId}
          className={`tab${c.id === activeId ? " active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
