/** ラベル付き入力の共通ラッパー。children に入力コントロールを内包する。 */
export function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children が input を内包する
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="font-medium text-slate-600 text-xs">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
