import type { ChangeSet } from "../data/diff";

const LIST_VERB: Record<string, string> = {
  inventory: "Item",
  skills: "Skill",
  effects: "Effect",
  achievements: "Achievement",
  contacts: "Contact",
};

export function ChangesBox({
  changes,
  chapterIndex,
  notes,
}: {
  changes: ChangeSet;
  chapterIndex: number;
  notes?: string;
}) {
  if (changes.changes.length === 0 && !notes) return null;
  return (
    <section className="changes">
      <h3>▲ What changed heading into Chapter {chapterIndex}</h3>
      <div className="body" style={{ padding: notes ? "10px 14px 0" : 0 }}>
        {notes && <p style={{ margin: "0 0 6px", color: "var(--text-dim)" }}>{notes}</p>}
      </div>
      <ul>
        {changes.changes.map((c, i) => {
          if (c.kind === "scalar") {
            return (
              <li key={i} className="chg-scalar">
                {c.label}: <b>{fmt(c.from)}</b> <span className="arrow">→</span>{" "}
                <b>{fmt(c.to)}</b>
              </li>
            );
          }
          if (c.kind === "remove") {
            return (
              <li key={i} className="chg-remove">
                {LIST_VERB[c.list]} lost: {c.name}
              </li>
            );
          }
          const verb = c.kind === "add" ? "gained" : "updated";
          return (
            <li key={i} className="chg-add">
              {LIST_VERB[c.list]} {verb}: {c.name}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const fmt = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
