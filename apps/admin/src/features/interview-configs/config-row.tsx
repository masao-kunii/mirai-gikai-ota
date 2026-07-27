import { Check, Pencil, Power, X } from "lucide-react";
import { useState } from "react";
import { Field } from "../../components/field";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass, inputClass, primaryButtonClass } from "../../lib/ui";
import {
  CONFIG_STATUS_BADGE,
  CONFIG_STATUS_LABELS,
  type ConfigStatus,
  type InterviewMode,
  MODE_LABELS,
  MODE_OPTIONS,
  TARGET_TYPE_LABELS,
} from "./config-labels";
import {
  type AdminInterviewConfig,
  type UpdateConfigInput,
  useDeleteConfig,
  useUpdateConfig,
} from "./interview-configs-queries";

const CONFIG_COLSPAN = 6;

/** インタビュー設定1行。受付/終了の切替と、行を展開した基本編集を持つ。 */
export function ConfigRow({ config }: { config: AdminInterviewConfig }) {
  const [editing, setEditing] = useState(false);
  const updateConfig = useUpdateConfig();
  const deleteConfig = useDeleteConfig();

  const toggleStatus = () => {
    const next: ConfigStatus = config.status === "public" ? "closed" : "public";
    updateConfig.mutate({ id: config.id, input: { status: next } });
  };

  if (editing) {
    return (
      <EditConfigRow
        config={config}
        pending={updateConfig.isPending}
        error={updateConfig.isError ? updateConfig.error.message : null}
        onCancel={() => {
          updateConfig.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateConfig.mutate(
            { id: config.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b align-top">
      <td className="px-3 py-2 text-slate-600 text-xs">
        {config.target ? (
          <>
            <span className="text-slate-400">
              {TARGET_TYPE_LABELS[config.target.type]}
            </span>
            <div className="text-slate-700">{config.target.name}</div>
          </>
        ) : (
          <span className="text-slate-400">対象不明</span>
        )}
      </td>
      <td className="px-3 py-2 text-slate-800">{config.name}</td>
      <td className="px-3 py-2 text-center">
        <span
          className={`rounded px-2 py-0.5 font-medium text-xs ${CONFIG_STATUS_BADGE[config.status]}`}
        >
          {CONFIG_STATUS_LABELS[config.status as ConfigStatus]}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-600">
        {MODE_LABELS[config.mode as InterviewMode] ?? config.mode}
      </td>
      <td className="px-3 py-2 text-center text-slate-600">
        {config.sessionCount}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={toggleStatus}
            disabled={updateConfig.isPending}
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100 disabled:opacity-50"
          >
            <Power className="size-3" />
            {config.status === "public" ? "終了する" : "受付再開"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={iconButtonClass}
            aria-label="編集"
          >
            <Pencil className="size-4" />
          </button>
          {config.sessionCount === 0 ? (
            <InlineDeleteConfirm
              onConfirm={() => deleteConfig.mutate(config.id)}
              pending={deleteConfig.isPending}
              error={deleteConfig.isError ? deleteConfig.error.message : null}
            />
          ) : null}
        </div>
        {updateConfig.isError ? (
          <p className="mt-1 text-right text-red-600 text-xs">
            {updateConfig.error.message}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

function EditConfigRow({
  config,
  pending,
  error,
  onSave,
  onCancel,
}: {
  config: AdminInterviewConfig;
  pending: boolean;
  error: string | null;
  onSave: (input: UpdateConfigInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(config.name);
  const [status, setStatus] = useState<ConfigStatus>(
    config.status as ConfigStatus
  );
  const [mode, setMode] = useState<InterviewMode>(config.mode as InterviewMode);
  const [duration, setDuration] = useState(
    config.estimatedDuration === null ? "" : String(config.estimatedDuration)
  );

  const save = () =>
    onSave({
      name: name.trim(),
      status,
      mode,
      estimatedDuration: duration.trim() === "" ? null : Number(duration),
    });

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-3" colSpan={CONFIG_COLSPAN}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="設定名" className="col-span-2">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label="状態">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as ConfigStatus)}
            >
              <option value="public">受付中</option>
              <option value="closed">終了</option>
            </select>
          </Field>
          <Field label="モード">
            <select
              className={inputClass}
              value={mode}
              onChange={(e) => setMode(e.target.value as InterviewMode)}
            >
              {MODE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="推定所要（分）">
            <input
              className={inputClass}
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="任意"
            />
          </Field>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          {error ? <span className="text-red-600 text-sm">{error}</span> : null}
          <button
            type="button"
            onClick={onCancel}
            className={`${iconButtonClass} border border-slate-300`}
            aria-label="キャンセル"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || name.trim() === ""}
            className={primaryButtonClass}
          >
            <Check className="size-4" />
            保存
          </button>
        </div>
      </td>
    </tr>
  );
}
