import type { ReactNode } from "react";

/** 本文を最大幅 4xl に収める共通コンテナ（現行 web の Container 相当） */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
