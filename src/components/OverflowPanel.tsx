import { Fragment, useEffect, useState, type ReactNode } from "react";

/** Full-screen overlay listing the complete contents of a panel. */
export function Modal({
  title,
  onClose,
  children,
  bodyClassName,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  bodyClassName?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={`modal-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface OverflowPanelProps<T> {
  title: string;
  items: T[];
  keyOf: (t: T) => string;
  render: (t: T, mode: "compact" | "full") => ReactNode;
  max?: number;
  emptyText?: string;
  /** Extra class for the body/modal containers, e.g. to lay items out in a grid. */
  bodyClassName?: string;
}

/**
 * A panel that shows only the `max` most-recent items, with a click-to-expand
 * modal listing everything. Used for lists that can grow without bound
 * (achievements, inventory, skills, effects, contacts). "Most recent" = last
 * added; the composed list is chronological, so we reverse for display.
 */
export function OverflowPanel<T>({
  title,
  items,
  keyOf,
  render,
  max = 10,
  emptyText = "None.",
  bodyClassName,
}: OverflowPanelProps<T>) {
  const [open, setOpen] = useState(false);
  const recent = [...items].reverse();
  const shown = recent.slice(0, max);
  const hasMore = items.length > max;

  return (
    <section className="panel">
      <h3
        className={hasMore ? "clickable" : undefined}
        onClick={hasMore ? () => setOpen(true) : undefined}
        title={hasMore ? "Click to see all" : undefined}
      >
        {title}
        {items.length > 0 && <span className="count">{items.length}</span>}
      </h3>
      <div className={`body${bodyClassName ? ` ${bodyClassName}` : ""}`}>
        {items.length === 0 ? (
          <p className="empty">{emptyText}</p>
        ) : (
          <>
            {shown.map((it) => (
              <Fragment key={keyOf(it)}>{render(it, "compact")}</Fragment>
            ))}
            {hasMore && (
              <button className="show-all" onClick={() => setOpen(true)}>
                Show all {items.length} →
              </button>
            )}
          </>
        )}
      </div>
      {open && (
        <Modal
          title={`${title} (${items.length})`}
          onClose={() => setOpen(false)}
          bodyClassName={bodyClassName}
        >
          {recent.map((it) => (
            <Fragment key={keyOf(it)}>{render(it, "full")}</Fragment>
          ))}
        </Modal>
      )}
    </section>
  );
}
