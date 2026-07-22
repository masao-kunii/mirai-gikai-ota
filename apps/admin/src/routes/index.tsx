import { createFileRoute, redirect } from "@tanstack/react-router";

// トップは当面タグ管理へ寄せる（ドメインが増えたらダッシュボードに差し替え）。
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/tags" });
  },
});
