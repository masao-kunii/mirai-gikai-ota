import { Check, Pencil, Star, X } from "lucide-react";
import { useState } from "react";
import { Field } from "../../components/field";
import { InlineDeleteConfirm } from "../../components/inline-delete-confirm";
import { iconButtonClass, inputClass, primaryButtonClass } from "../../lib/ui";
import { useCommittees } from "../committees/committees-queries";
import { useCouncilSessions } from "../council-sessions/council-sessions-queries";
import {
  BILL_STATUS_LABELS,
  BILL_STATUS_OPTIONS,
  type BillStatus,
  PROPOSAL_TYPE_LABELS,
  PROPOSAL_TYPE_OPTIONS,
  type ProposalType,
  PUBLISH_STATUS_BADGE,
  PUBLISH_STATUS_LABELS,
  PUBLISH_STATUS_OPTIONS,
  type PublishStatus,
} from "./bill-labels";
import {
  type AdminBill,
  type UpdateBillInput,
  useDeleteBill,
  useUpdateBill,
} from "./bills-queries";

const BILL_COLSPAN = 6;

/** 議案1行。表示／展開編集を切り替える。編集では基本スカラー項目をまとめて更新する。 */
export function BillRow({ bill }: { bill: AdminBill }) {
  const [editing, setEditing] = useState(false);
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();

  if (editing) {
    return (
      <EditBillRow
        bill={bill}
        pending={updateBill.isPending}
        error={updateBill.isError ? updateBill.error.message : null}
        onCancel={() => {
          updateBill.reset();
          setEditing(false);
        }}
        onSave={(input) =>
          updateBill.mutate(
            { id: bill.id, input },
            { onSuccess: () => setEditing(false) }
          )
        }
      />
    );
  }

  return (
    <tr className="border-slate-100 border-b align-top">
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 font-medium text-slate-900">
          {bill.isFeatured ? (
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
          ) : null}
          {bill.name}
        </div>
        {bill.billNumber ? (
          <div className="text-slate-400 text-xs">{bill.billNumber}</div>
        ) : null}
      </td>
      <td className="px-3 py-2 text-center">
        <span
          className={`rounded px-2 py-0.5 font-medium text-xs ${PUBLISH_STATUS_BADGE[bill.publishStatus as PublishStatus]}`}
        >
          {PUBLISH_STATUS_LABELS[bill.publishStatus as PublishStatus]}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-600">
        {BILL_STATUS_LABELS[bill.status as BillStatus]}
      </td>
      <td className="px-3 py-2 text-slate-600">
        {PROPOSAL_TYPE_LABELS[bill.proposalType as ProposalType]}
      </td>
      <td className="px-3 py-2 text-slate-600 text-xs">
        <div>{bill.councilSessionName ?? "—"}</div>
        <div className="text-slate-400">{bill.committeeName ?? "—"}</div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={iconButtonClass}
            aria-label="編集"
          >
            <Pencil className="size-4" />
          </button>
          <InlineDeleteConfirm
            onConfirm={() => deleteBill.mutate(bill.id)}
            pending={deleteBill.isPending}
            error={deleteBill.isError ? deleteBill.error.message : null}
          />
        </div>
      </td>
    </tr>
  );
}

function EditBillRow({
  bill,
  pending,
  error,
  onSave,
  onCancel,
}: {
  bill: AdminBill;
  pending: boolean;
  error: string | null;
  onSave: (input: UpdateBillInput) => void;
  onCancel: () => void;
}) {
  const sessions = useCouncilSessions();
  const committees = useCommittees();
  const [name, setName] = useState(bill.name);
  const [billNumber, setBillNumber] = useState(bill.billNumber);
  const [status, setStatus] = useState<BillStatus>(bill.status as BillStatus);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>(
    bill.publishStatus as PublishStatus
  );
  const [proposalType, setProposalType] = useState<ProposalType>(
    bill.proposalType as ProposalType
  );
  const [councilSessionId, setCouncilSessionId] = useState(
    bill.councilSessionId ?? ""
  );
  const [committeeId, setCommitteeId] = useState(bill.committeeId ?? "");
  const [statusNote, setStatusNote] = useState(bill.statusNote ?? "");
  const [slug, setSlug] = useState(bill.slug ?? "");
  const [submittedDate, setSubmittedDate] = useState(
    bill.submittedDate ? bill.submittedDate.slice(0, 10) : ""
  );
  const [isFeatured, setIsFeatured] = useState(bill.isFeatured);
  const [isReviewCompleted, setIsReviewCompleted] = useState(
    bill.isReviewCompleted
  );

  const save = () =>
    onSave({
      name: name.trim(),
      billNumber: billNumber.trim(),
      status,
      publishStatus,
      proposalType,
      councilSessionId: councilSessionId || null,
      committeeId: committeeId || null,
      statusNote: statusNote.trim() || null,
      slug: slug.trim() || null,
      submittedDate: submittedDate || null,
      isFeatured,
      isReviewCompleted,
    });

  return (
    <tr className="border-slate-100 border-b bg-slate-50">
      <td className="px-3 py-3" colSpan={BILL_COLSPAN}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="議案名" className="col-span-2 md:col-span-3">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={500}
            />
          </Field>
          <Field label="議案番号">
            <input
              className={inputClass}
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              maxLength={100}
            />
          </Field>
          <Field label="提出区分">
            <select
              className={inputClass}
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value as ProposalType)}
            >
              {PROPOSAL_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="公開状態">
            <select
              className={inputClass}
              value={publishStatus}
              onChange={(e) =>
                setPublishStatus(e.target.value as PublishStatus)
              }
            >
              {PUBLISH_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="審議状況">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as BillStatus)}
            >
              {BILL_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="会期">
            <select
              className={inputClass}
              value={councilSessionId}
              onChange={(e) => setCouncilSessionId(e.target.value)}
            >
              <option value="">（未設定）</option>
              {(sessions.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="委員会">
            <select
              className={inputClass}
              value={committeeId}
              onChange={(e) => setCommitteeId(e.target.value)}
            >
              <option value="">（未設定）</option>
              {(committees.data ?? []).map((cm) => (
                <option key={cm.id} value={cm.id}>
                  {cm.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="上程日">
            <input
              className={inputClass}
              type="date"
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
            />
          </Field>
          <Field label="slug">
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </Field>
          <Field label="状況メモ" className="col-span-2 md:col-span-3">
            <input
              className={inputClass}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              maxLength={1000}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="size-4"
            />
            <span className="text-slate-600 text-sm">注目議案</span>
          </label>
          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              checked={isReviewCompleted}
              onChange={(e) => setIsReviewCompleted(e.target.checked)}
              className="size-4"
            />
            <span className="text-slate-600 text-sm">レビュー完了</span>
          </label>
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
