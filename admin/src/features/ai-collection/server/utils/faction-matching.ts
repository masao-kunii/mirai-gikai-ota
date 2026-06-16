import "server-only";

// 会派名マッチングの純粋ロジックは faction-matching-core.ts に切り出し、
// server-only が必要な既存の参照はこのファイル経由で維持する。
export {
  type FactionRecord,
  findFactionByName,
} from "./faction-matching-core";
