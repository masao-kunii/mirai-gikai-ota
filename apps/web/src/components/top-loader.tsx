import { useRouterState } from "@tanstack/react-router";

/** ページ遷移中に上部へ細いプログレスバーを表示する（現行 NextTopLoader 相当） */
export function TopLoader() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending",
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden">
      <div
        className={`h-full bg-primary transition-all duration-300 ease-out ${
          isLoading ? "w-full opacity-100" : "w-0 opacity-0"
        }`}
      />
    </div>
  );
}
