import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Field } from "../../components/field";
import { inputClass, primaryButtonClass } from "../../lib/ui";
import { useCommittees } from "../committees/committees-queries";
import { useCouncilSessions } from "../council-sessions/council-sessions-queries";
import {
  PROPOSAL_TYPE_OPTIONS,
  type ProposalType,
  PUBLISH_STATUS_OPTIONS,
  type PublishStatus,
} from "./bill-labels";
import { type CreateBillInput, useCreateBill } from "./bills-queries";

/**
 * 議案 新規作成フォーム（薄い初版）。議案名は必須。会期・委員会はマスタから選択。
 * 審議状況の詳細やタグ・本文などは作成後に編集で追加していく前提。
 */
export function CreateBillForm() {
  const [name, setName] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [proposalType, setProposalType] = useState<ProposalType>("mayor_bill");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("draft");
  const [councilSessionId, setCouncilSessionId] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const createBill = useCreateBill();
  const sessions = useCouncilSessions();
  const committees = useCommittees();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateBillInput = {
      name: name.trim(),
      billNumber: billNumber.trim(),
      proposalType,
      publishStatus,
      councilSessionId: councilSessionId || null,
      committeeId: committeeId || null,
    };
    createBill.mutate(input, {
      onSuccess: () => {
        setName("");
        setBillNumber("");
        setCouncilSessionId("");
        setCommitteeId("");
      },
    });
  };

  const disabled = name.trim() === "" || createBill.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="議案名" required className="col-span-2 md:col-span-3">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）大田区気候変動対策推進条例"
            maxLength={500}
          />
        </Field>
        <Field label="議案番号">
          <input
            className={inputClass}
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            placeholder="任意"
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
            onChange={(e) => setPublishStatus(e.target.value as PublishStatus)}
          >
            {PUBLISH_STATUS_OPTIONS.map(([value, label]) => (
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
            {(committees.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={disabled}
            className={primaryButtonClass}
          >
            <Plus className="size-4" />
            追加
          </button>
        </div>
      </div>
      {createBill.isError ? (
        <p className="mt-2 text-red-600 text-sm">{createBill.error.message}</p>
      ) : null}
    </form>
  );
}
