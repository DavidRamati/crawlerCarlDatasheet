import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface TipState {
  node: ReactNode;
  x: number;
  y: number;
}

interface TooltipApi {
  show: (node: ReactNode, e: { clientX: number; clientY: number }) => void;
  hide: () => void;
}

const TooltipContext = createContext<TooltipApi | null>(null);

export function useTooltip(): TooltipApi {
  const api = useContext(TooltipContext);
  if (!api) throw new Error("useTooltip must be used within TooltipProvider");
  return api;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback<TooltipApi["show"]>((node, e) => {
    // Offset from the cursor; clamp near the right/bottom edges.
    const x = Math.min(e.clientX + 16, window.innerWidth - 300);
    const y = Math.min(e.clientY + 16, window.innerHeight - 160);
    setTip({ node, x, y });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  return (
    <TooltipContext.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }}>
          {tip.node}
        </div>
      )}
    </TooltipContext.Provider>
  );
}
