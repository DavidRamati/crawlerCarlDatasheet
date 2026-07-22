import { useEffect, useState } from "react";
import { loadBook, type BookData } from "./data/loader";
import { compareSnapshots, type Change, type ChangeSet } from "./data/diff";
import { deriveViewSnapshot } from "./data/derive";
import { TooltipProvider } from "./components/Tooltip";
import { SceneBackground } from "./components/SceneBackground";
import { BookContext } from "./components/BookContext";
import { ChapterSelect } from "./components/ChapterSelect";
import { CharacterTabs } from "./components/CharacterTabs";
import { ChangesBox } from "./components/ChangesBox";
import { CharacterArt } from "./components/CharacterArt";
import {
  AchievementsPanel,
  ContactsPanel,
  EffectsPanel,
  EquipmentPanel,
  IdentityPanel,
  InventoryPanel,
  MiscPanel,
  ResourcesPanel,
  SkillsPanel,
  StatsPanel,
  type PanelProps,
} from "./components/panels";

const BOOK_ID = "book1";

export default function App() {
  const [book, setBook] = useState<BookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(1);
  const [charId, setCharId] = useState("carl");
  const [showChanges, setShowChanges] = useState(true);

  useEffect(() => {
    loadBook(BOOK_ID)
      .then((b) => {
        setBook(b);
        setChapterIndex(b.manifest.chapters[0]?.index ?? 1);
        setCharId(b.manifest.characters[0]?.id ?? "carl");
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!book) return <div className="loading">Loading the dungeon…</div>;

  const chapters = book.manifest.chapters;
  const visible = book.manifest.characters.filter(
    (c) => c.joinsPartyAtChapter <= chapterIndex,
  );
  const activeId = visible.some((c) => c.id === charId)
    ? charId
    : (visible[0]?.id ?? charId);

  const charData = book.characters.get(activeId);
  const snap = charData?.composed.byChapter.get(chapterIndex) ?? null;

  const orderPos = chapters.findIndex((c) => c.index === chapterIndex);
  const prevIndex = orderPos > 0 ? chapters[orderPos - 1].index : null;
  const prevSnap =
    prevIndex !== null
      ? (charData?.composed.byChapter.get(prevIndex) ?? null)
      : null;

  // Diff on derived views so highlights reflect effective stats + granted skills.
  const viewSnap = snap ? deriveViewSnapshot(snap) : null;
  const viewPrev = prevSnap ? deriveViewSnapshot(prevSnap) : null;
  const changes: ChangeSet = viewSnap
    ? compareSnapshots(viewPrev, viewSnap)
    : { changes: [], changedKeys: new Set<string>(), itemStatus: new Map() };
  const scalarChanges = new Map<string, Extract<Change, { kind: "scalar" }>>();
  for (const c of changes.changes) if (c.kind === "scalar") scalarChanges.set(c.key, c);

  // Background scene: active character's scene, else any character present here.
  let sceneId = snap?.scene ?? null;
  if (!sceneId) {
    for (const [, cd] of book.characters) {
      const s = cd.composed.byChapter.get(chapterIndex)?.scene;
      if (s) {
        sceneId = s;
        break;
      }
    }
  }

  const onChapter = (idx: number) => {
    setChapterIndex(idx);
    const nowVisible = book.manifest.characters.filter(
      (c) => c.joinsPartyAtChapter <= idx,
    );
    if (!nowVisible.some((c) => c.id === charId)) {
      setCharId(nowVisible[0]?.id ?? charId);
    }
  };

  const activeRef = book.manifest.characters.find((c) => c.id === activeId)!;
  const notes = prevIndex !== null
    ? charData?.composed.notesByChapter.get(prevIndex)
    : undefined;

  const panelProps: PanelProps | null = snap
    ? { snap, changes, scalarChanges, showChanges }
    : null;

  return (
    <TooltipProvider>
      <BookContext.Provider value={BOOK_ID}>
      <SceneBackground bookId={BOOK_ID} sceneId={sceneId} />
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="sys">DCC</span> Statsheet
            <span className="sub">Interactive statsheet · {book.manifest.book.title}</span>
          </div>
          <div className="controls">
            <ChapterSelect chapters={chapters} value={chapterIndex} onChange={onChapter} />
            <div className="field">
              <span className="field-cap">Display</span>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showChanges}
                  onChange={(e) => setShowChanges(e.target.checked)}
                />
                Highlight changes
              </label>
            </div>
          </div>
        </header>

        <CharacterTabs visible={visible} activeId={activeId} onSelect={setCharId} />

        {showChanges && snap && (
          <ChangesBox changes={changes} chapterIndex={chapterIndex} notes={notes} />
        )}

        {panelProps && snap ? (
          <div className="sheet">
            <div className="column">
              <CharacterArt
                bookId={BOOK_ID}
                charId={activeId}
                name={activeRef.name}
                stateId={snap.appearance.stateId}
                chapterIndex={chapterIndex}
              />
              <IdentityPanel {...panelProps} />
              <StatsPanel {...panelProps} />
              <ResourcesPanel {...panelProps} />
            </div>
            <div className="panel-grid">
              <EquipmentPanel {...panelProps} />
              <InventoryPanel {...panelProps} />
              <SkillsPanel {...panelProps} />
              <EffectsPanel {...panelProps} />
              <AchievementsPanel {...panelProps} />
              <ContactsPanel {...panelProps} />
              <MiscPanel {...panelProps} />
            </div>
          </div>
        ) : (
          <div className="empty" style={{ padding: 40 }}>
            {activeRef.name} has not appeared yet at this point in the story.
          </div>
        )}

        <footer className="footer">
          Spoiler-safe: shows only what is known at the start of the selected
          chapter. Data authored from the book text.
        </footer>
      </div>
      </BookContext.Provider>
    </TooltipProvider>
  );
}
