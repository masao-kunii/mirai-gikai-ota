import type { AdminInterviewConfig } from "../interview-configs/interview-configs-queries";
import { TARGET_TYPE_LABELS } from "../interview-reports/moderation-labels";
import {
  MODERATION_OPTIONS,
  ORDER_OPTIONS,
  REVIEW_OPTIONS,
  ROLE_OPTIONS,
  type SessionSearch,
  SORT_OPTIONS,
  STANCE_OPTIONS,
  STATUS_OPTIONS,
} from "./session-search";

const selectClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

/** 回答一覧の絞り込みと並べ替え。変更すると1ページ目に戻る。 */
export function SessionFilterBar({
  search,
  configs,
  onChange,
}: {
  search: SessionSearch;
  configs: AdminInterviewConfig[];
  onChange: (next: Partial<SessionSearch>) => void;
}) {
  const set = (next: Partial<SessionSearch>) => onChange({ ...next, page: 1 });

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <Filter label="インタビュー設定">
        <select
          value={search.configId ?? ""}
          onChange={(e) => set({ configId: e.target.value || undefined })}
          className={`${selectClass} max-w-72`}
        >
          <option value="">すべての設定</option>
          {configs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.target
                ? `${TARGET_TYPE_LABELS[c.target.type]}：${c.target.name}`
                : c.name}
              （{c.sessionCount}件）
            </option>
          ))}
        </select>
      </Filter>
      <Filter label="進行状況">
        <Options
          value={search.status}
          options={STATUS_OPTIONS}
          onChange={(status) => set({ status })}
        />
      </Filter>
      <Filter label="審査状態">
        <Options
          value={search.review}
          options={REVIEW_OPTIONS}
          onChange={(review) => set({ review })}
        />
      </Filter>
      <Filter label="スタンス">
        <Options
          value={search.stance}
          options={STANCE_OPTIONS}
          onChange={(stance) => set({ stance })}
        />
      </Filter>
      <Filter label="立場">
        <Options
          value={search.role}
          options={ROLE_OPTIONS}
          onChange={(role) => set({ role })}
        />
      </Filter>
      <Filter label="モデレーション">
        <Options
          value={search.moderation}
          options={MODERATION_OPTIONS}
          onChange={(moderation) => set({ moderation })}
        />
      </Filter>
      <Filter label="並べ替え">
        <div className="flex gap-1">
          <Options
            value={search.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => set({ sort })}
          />
          <Options
            value={search.order}
            options={ORDER_OPTIONS}
            onChange={(order) => set({ order })}
          />
        </div>
      </Filter>
    </section>
  );
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children が select を内包する
    <label className="flex flex-col gap-1 text-slate-500 text-xs">
      {label}
      {children}
    </label>
  );
}

function Options<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={selectClass}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
