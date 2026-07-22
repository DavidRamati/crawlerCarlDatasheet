import { useState, type ReactNode } from "react";
import type { Item, Rarity } from "../schema";
import { useTooltip } from "./Tooltip";
import { useBookId } from "./BookContext";

const RARITY_VAR: Record<Rarity, string> = {
  common: "var(--r-common)",
  uncommon: "var(--r-uncommon)",
  rare: "var(--r-rare)",
  epic: "var(--r-epic)",
  legendary: "var(--r-legendary)",
  unknown: "var(--r-unknown)",
};

export function rarityColor(r: Rarity): string {
  return RARITY_VAR[r] ?? RARITY_VAR.unknown;
}

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

export function ItemIcon({ item }: { item: Item }) {
  const bookId = useBookId();
  const [broken, setBroken] = useState(false);
  // Prefer an explicit icon path; otherwise resolve by convention so simply
  // dropping art/<book>/items/<id>.png makes the icon appear.
  const src = item.icon
    ? `${import.meta.env.BASE_URL}${item.icon}`
    : `${import.meta.env.BASE_URL}art/${bookId}/items/${item.id}.png`;
  if (!broken) {
    return (
      <img
        className="item-icon"
        src={src}
        alt={item.name}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="item-icon" aria-hidden>
      {initials(item.name)}
    </span>
  );
}

function TipContent({ item }: { item: Item }) {
  return (
    <>
      <div className="t-name" style={{ color: rarityColor(item.rarity) }}>
        {item.name}
        {item.qty && item.qty > 1 ? ` ×${item.qty}` : ""}
      </div>
      <div className="t-rarity" style={{ color: rarityColor(item.rarity) }}>
        {item.rarity}
      </div>
      {item.effects && <div className="t-eff">{item.effects}</div>}
      {item.description && <div className="t-desc">{item.description}</div>}
      {!item.effects && !item.description && (
        <div className="t-desc">No description recorded.</div>
      )}
    </>
  );
}

/** Wraps arbitrary content so hovering shows the item tooltip. */
export function WithItemTip({
  item,
  className,
  children,
}: {
  item: Item;
  className?: string;
  children: ReactNode;
}) {
  const tip = useTooltip();
  return (
    <div
      className={className}
      onMouseMove={(e) => tip.show(<TipContent item={item} />, e)}
      onMouseLeave={tip.hide}
    >
      {children}
    </div>
  );
}

export function ItemRow({
  item,
  highlight,
}: {
  item: Item;
  highlight?: boolean;
}) {
  return (
    <WithItemTip item={item} className={`item-row${highlight ? " added" : ""}`}>
      <span className="rarity-dot" style={{ background: rarityColor(item.rarity) }} />
      <ItemIcon item={item} />
      <span className="item-main">
        <span className="item-name">{item.name}</span>
      </span>
      {item.qty && item.qty > 1 && <span className="item-qty">×{item.qty}</span>}
    </WithItemTip>
  );
}
