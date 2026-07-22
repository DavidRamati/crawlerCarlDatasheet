import type { ReactNode } from "react";
import { EQUIPMENT_SLOTS, type Snapshot } from "../schema";
import type { Change, ChangeSet } from "../data/diff";
import {
  STAT_KEYS,
  STAT_META,
  derivedSkills,
  effectiveStats,
} from "../data/derive";
import { ItemRow, WithItemTip } from "./items";
import { OverflowPanel } from "./OverflowPanel";
import { useTooltip } from "./Tooltip";

export interface PanelProps {
  snap: Snapshot;
  changes: ChangeSet;
  scalarChanges: Map<string, Extract<Change, { kind: "scalar" }>>;
  showChanges: boolean;
}

const fmt = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);

function changedClass(props: PanelProps, key: string, base = ""): string {
  const on = props.showChanges && props.changes.changedKeys.has(key);
  return on ? `${base} changed`.trim() : base;
}

function added(props: PanelProps, list: string, id: string): boolean {
  return props.showChanges && props.changes.itemStatus.has(`${list}:${id}`);
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="body">{children}</div>
    </section>
  );
}

/* ------------------------------- Identity -------------------------------- */

export function IdentityPanel(p: PanelProps) {
  const { snap } = p;
  const rows: Array<[string, string, string]> = [
    ["Level", fmt(snap.level), "level"],
    ["Floor", fmt(snap.floor), "floor"],
    ["Race", fmt(snap.identity.race), "identity.race"],
    ["Class", fmt(snap.identity.class), "identity.class"],
    ["Title", fmt(snap.identity.title), "identity.title"],
    ["Location", fmt(snap.location), "location"],
  ];
  return (
    <Panel title="Identity">
      <dl className="kv">
        {rows.map(([k, v, key]) => (
          <div key={key} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd className={changedClass(p, key)}>{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* --------------------------------- Stats --------------------------------- */

export function StatsPanel(p: PanelProps) {
  const tip = useTooltip();
  const eff = effectiveStats(p.snap);
  const anyKnown = STAT_KEYS.some((k) => eff[k].total !== null);

  return (
    <Panel title="Core Stats">
      {!anyKnown ? (
        <p className="empty">Stats not yet revealed at this point in the story.</p>
      ) : (
        <div className="stat-tiles">
          {STAT_KEYS.map((k) => {
            const meta = STAT_META[k];
            const b = eff[k];
            const key = `stats.${k}`;
            const chg = p.scalarChanges.get(key);
            const tipNode = (
              <>
                <div className="t-name">
                  {meta.label} ({meta.abbr})
                </div>
                <div className="t-desc">Base: {fmt(b.base)}</div>
                {b.bonuses.map((bo, i) => (
                  <div key={i} className="t-eff">
                    {bo.name}: {bo.amount >= 0 ? "+" : ""}
                    {bo.amount}
                  </div>
                ))}
                {b.bonuses.length > 0 && (
                  <div className="t-name" style={{ marginTop: 4 }}>
                    = {fmt(b.total)}
                  </div>
                )}
                <div className="t-desc" style={{ marginTop: 6 }}>
                  {meta.affects}
                </div>
              </>
            );
            return (
              <div
                key={k}
                className={changedClass(p, key, "stat-tile")}
                style={{ cursor: "help" }}
                onMouseMove={(e) => tip.show(tipNode, e)}
                onMouseLeave={tip.hide}
              >
                <div className="abbr">{meta.abbr}</div>
                <div className="val">
                  {fmt(b.total)}
                  {b.bonuses.length > 0 && <span className="buffed"> ▲</span>}
                </div>
                {p.showChanges && chg && chg.from !== null && (
                  <div className="was">was {fmt(chg.from)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------- Resources ------------------------------- */

function Bar({ label, cur, max, color }: { label: string; cur: number | null; max: number; color: string }) {
  const pct = cur === null ? 100 : Math.max(0, Math.min(100, (cur / max) * 100));
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--text-dim)" }}>{label}</span>
        <span style={{ fontFamily: "var(--mono)" }}>
          {cur === null ? "?" : cur} / {max}
        </span>
      </div>
      <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

export function ResourcesPanel(p: PanelProps) {
  const { hp, mana } = p.snap.resources;
  const hasHp = hp.max !== null;
  const hasMana = mana.max !== null;
  if (!hasHp && !hasMana) return null;
  return (
    <Panel title="Resources">
      {hasHp && <Bar label="Health" cur={hp.cur} max={hp.max!} color="var(--bad)" />}
      {hasMana && <Bar label="Mana" cur={mana.cur} max={mana.max!} color="var(--r-rare)" />}
    </Panel>
  );
}

/* ------------------------------- Equipment ------------------------------- */

export function EquipmentPanel(p: PanelProps) {
  const { equipment } = p.snap;
  const anyFilled = EQUIPMENT_SLOTS.some((s) => equipment[s]);
  return (
    <Panel title="Equipment">
      {!anyFilled ? (
        <p className="empty">Nothing equipped.</p>
      ) : (
        <div className="slots">
          {EQUIPMENT_SLOTS.map((slot) => {
            const item = equipment[slot];
            const label = slot[0].toUpperCase() + slot.slice(1);
            if (!item) {
              return (
                <div key={slot} className="slot">
                  <div className="slabel">{label}</div>
                  <div className="sitem empty">—</div>
                </div>
              );
            }
            return (
              <WithItemTip key={slot} item={item} className="slot filled">
                <div className="slabel">{label}</div>
                <div className="sitem">{item.name}</div>
              </WithItemTip>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------- Inventory ------------------------------- */

export function InventoryPanel(p: PanelProps) {
  return (
    <OverflowPanel
      title="Inventory"
      items={p.snap.inventory}
      keyOf={(it) => it.id}
      emptyText="Empty."
      render={(it) => <ItemRow item={it} highlight={added(p, "inventory", it.id)} />}
    />
  );
}

/* --------------------------------- Skills -------------------------------- */

export function SkillsPanel(p: PanelProps) {
  const skills = derivedSkills(p.snap);
  return (
    <OverflowPanel
      title="Skills & Spells"
      items={skills}
      keyOf={(s) => s.id}
      emptyText="No skills yet."
      render={(s) => (
        <div
          className={`item-row${added(p, "skills", s.id) ? " added" : ""}`}
          title={s.description ?? ""}
        >
          <span className="item-main">
            <span className="item-name">{s.name}</span>
            {s.grantedBy && <span className="granted"> (from {s.grantedBy})</span>}
          </span>
          <span className="item-qty">{s.level !== undefined ? `Lv ${s.level}` : "—"}</span>
        </div>
      )}
    />
  );
}

/* --------------------------------- Effects ------------------------------- */

export function EffectsPanel(p: PanelProps) {
  const color = (k: string) =>
    k === "buff" ? "var(--good)" : k === "debuff" ? "var(--bad)" : "var(--text-dim)";
  return (
    <OverflowPanel
      title="Effects & Buffs"
      items={p.snap.effects}
      keyOf={(e) => e.id}
      emptyText="No active effects."
      render={(e) => (
        <div
          className={`item-row${added(p, "effects", e.id) ? " added" : ""}`}
          title={e.description ?? ""}
        >
          <span className="rarity-dot" style={{ background: color(e.kind) }} />
          <span className="item-main">
            <span className="item-name">{e.name}</span>
          </span>
          <span className="item-qty">{e.kind}</span>
        </div>
      )}
    />
  );
}

/* ------------------------------ Achievements ----------------------------- */

export function AchievementsPanel(p: PanelProps) {
  return (
    <OverflowPanel
      title="Achievements"
      items={p.snap.achievements}
      keyOf={(a) => a.id}
      emptyText="None unlocked."
      render={(a, mode) =>
        mode === "compact" ? (
          <div
            className={`achv-chip${added(p, "achievements", a.id) ? " added" : ""}`}
            title={[a.description, a.reward ? `Reward: ${a.reward}` : ""].filter(Boolean).join("\n")}
          >
            🏆 {a.name}
          </div>
        ) : (
          <div className="achv">
            <div className="name">🏆 {a.name}</div>
            {a.description && <div className="reward">{a.description}</div>}
            {a.reward && <div className="reward">Reward: {a.reward}</div>}
          </div>
        )
      }
    />
  );
}

/* -------------------------------- Contacts ------------------------------- */

export function ContactsPanel(p: PanelProps) {
  return (
    <OverflowPanel
      title="Contacts & Party"
      items={p.snap.contacts}
      keyOf={(c) => c.id}
      emptyText="No known contacts."
      render={(c, mode) =>
        mode === "compact" ? (
          <div
            className={`contact-row${added(p, "contacts", c.id) ? " added" : ""}`}
            title={c.note ?? ""}
          >
            <div className="contact-head">
              <span className="item-name">{c.name}</span>
              <span className="contact-rel">{c.relation}</span>
            </div>
            {c.note && <div className="contact-note">{c.note}</div>}
          </div>
        ) : (
          <div className="achv">
            <div className="name">{c.name}</div>
            <div className="reward">{c.relation}</div>
            {c.note && <div className="reward">{c.note}</div>}
          </div>
        )
      }
    />
  );
}

/* ---------------------------------- Misc --------------------------------- */

export function MiscPanel(p: PanelProps) {
  const entries = Object.entries(p.snap.misc ?? {}).filter(([, v]) => v !== null);
  if (entries.length === 0) return null;
  const label = (k: string) =>
    k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  return (
    <Panel title="Misc">
      <dl className="kv">
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{label(k)}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
