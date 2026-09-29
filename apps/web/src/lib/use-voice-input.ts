import {
  appendTranscript,
  pickRecordingMimeType,
} from "@mirai-gikai/shared/interviews/transcribe";
import { useCallback, useRef, useState } from "react";

/** 音声入力の状態。録音中と文字起こし中はボタンの見た目を分ける。 */
export type VoiceState = "idle" | "recording" | "transcribing";

/**
 * マイクで録音し、api に送って文字に起こす。起こした文字は入力欄に足すだけで、
 * 送信はしない（誤変換を本人が直せるようにするため）。
 *
 * 純粋な部分（形式の選択・入力欄への追記）は
 * `@mirai-gikai/shared/interviews/transcribe` にあり、そちらでテストしている。
 */
export function useVoiceInput(
  onTranscript: (update: (current: string) => string) => void
) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  /** ブラウザがマイク録音に対応しているか（http では getUserMedia が無い）。 */
  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("マイクを使えませんでした。ブラウザの許可を確認してください。");
      return;
    }

    const mimeType = pickRecordingMimeType((t) =>
      MediaRecorder.isTypeSupported(t)
    );
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    });

    recorder.addEventListener("stop", async () => {
      // マイクの使用を確実に終える（タブのインジケータを残さない）
      for (const track of stream.getTracks()) track.stop();
      recorderRef.current = null;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      if (blob.size === 0) {
        setState("idle");
        return;
      }
      setState("transcribing");
      try {
        const res = await fetch("/api/interviews/transcribe", {
          method: "POST",
          headers: { "content-type": blob.type },
          body: blob,
        });
        if (!res.ok) {
          setError(
            res.status === 429
              ? "少し時間をおいてからもう一度お試しください。"
              : "うまく聞き取れませんでした。もう一度お試しください。"
          );
          return;
        }
        const { text } = (await res.json()) as { text: string };
        if (!text.trim()) {
          setError("声が聞き取れませんでした。もう一度お試しください。");
          return;
        }
        onTranscript((current) => appendTranscript(current, text));
      } catch {
        setError("通信に失敗しました。もう一度お試しください。");
      } finally {
        setState("idle");
      }
    });

    recorder.start();
    setState("recording");
  }, [onTranscript]);

  return { state, error, supported, start, stop };
}
