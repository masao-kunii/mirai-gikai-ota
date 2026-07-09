import type { ReactNode } from "react";
import { Container } from "./container";

/** 利用規約・プライバシーポリシー等の法務ページ共通レイアウト（現行 web を移植） */
export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Container className="space-y-10 py-12">
      <header className="space-y-3 border-mirai-border-light border-b pb-6">
        <h1 className="font-bold text-2xl text-mirai-text tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-base text-mirai-text-secondary leading-relaxed">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-8 text-mirai-text-secondary">{children}</div>
    </Container>
  );
}

export function LegalSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-semibold text-lg text-mirai-text tracking-tight sm:text-xl">
      {children}
    </h2>
  );
}

export function LegalSubSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-semibold text-base text-mirai-text tracking-tight">
      {children}
    </h3>
  );
}

export function LegalParagraph({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-sm text-mirai-text-secondary leading-relaxed sm:text-base ${className}`}
    >
      {children}
    </p>
  );
}

type LegalListItem = string | { id: string; content: ReactNode };

export function LegalList({ items }: { items: LegalListItem[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-mirai-text-secondary leading-relaxed sm:text-base">
      {items.map((item) => {
        const key = typeof item === "string" ? item : item.id;
        const content = typeof item === "string" ? item : item.content;
        return <li key={key}>{content}</li>;
      })}
    </ul>
  );
}
