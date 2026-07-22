import type { ChapterRef } from "../schema";

export function ChapterSelect({
  chapters,
  value,
  onChange,
}: {
  chapters: ChapterRef[];
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <label className="field">
      State at start of
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {chapters.map((c) => (
          <option key={c.index} value={c.index}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
