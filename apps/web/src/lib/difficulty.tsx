import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * 説明の難易度（normal=標準 / hard=もっと詳しく）をサイト全体で共有する。
 * ヘッダーのトグルで切り替え、議案詳細の本文とチャットの difficultyLevel に反映する。
 * localStorage に永続化する（SSR は normal 既定、hydration 後に復元）。
 */
export type DifficultyLevel = "normal" | "hard";

const STORAGE_KEY = "mg_difficulty";

type DifficultyContextValue = {
  level: DifficultyLevel;
  setLevel: (level: DifficultyLevel) => void;
  toggle: () => void;
};

const DifficultyContext = createContext<DifficultyContextValue | null>(null);

export function DifficultyProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<DifficultyLevel>("normal");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "hard" || saved === "normal") {
      setLevelState(saved);
    }
  }, []);

  const setLevel = (next: DifficultyLevel) => {
    setLevelState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage 不可の環境ではメモリ内のみ
    }
  };

  const toggle = () => setLevel(level === "normal" ? "hard" : "normal");

  return (
    <DifficultyContext.Provider value={{ level, setLevel, toggle }}>
      {children}
    </DifficultyContext.Provider>
  );
}

export function useDifficulty(): DifficultyContextValue {
  const ctx = useContext(DifficultyContext);
  // Provider 外でも normal 固定で安全に動く（想定外のフォールバック）
  return ctx ?? { level: "normal", setLevel: () => {}, toggle: () => {} };
}
