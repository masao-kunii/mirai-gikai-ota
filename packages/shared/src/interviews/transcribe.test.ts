import { describe, expect, it } from "vitest";
import {
  appendTranscript,
  cleanTranscript,
  MAX_AUDIO_BYTES,
  normalizeAudioType,
  pickRecordingMimeType,
} from "./transcribe";

describe("normalizeAudioType", () => {
  it("codecs 付きの Content-Type から形式を取り出す", () => {
    expect(normalizeAudioType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeAudioType("AUDIO/MP4")).toBe("audio/mp4");
  });

  it("対象外の形式と未指定は null", () => {
    expect(normalizeAudioType("video/mp4")).toBeNull();
    expect(normalizeAudioType("application/json")).toBeNull();
    expect(normalizeAudioType(null)).toBeNull();
    expect(normalizeAudioType("")).toBeNull();
  });
});

describe("cleanTranscript", () => {
  it("前後の空白を落とす", () => {
    expect(cleanTranscript("  保育園を増やしてほしいです。 \n")).toBe(
      "保育園を増やしてほしいです。"
    );
  });

  it("コードフェンスと全体を囲む引用符を外す", () => {
    expect(cleanTranscript('```\n蒲田駅の駐輪場が足りません。\n```')).toBe(
      "蒲田駅の駐輪場が足りません。"
    );
    expect(cleanTranscript("「学童の定員を増やしてほしい」")).toBe(
      "学童の定員を増やしてほしい"
    );
  });

  it("本文中の引用符は残す", () => {
    expect(cleanTranscript('区は「切れ目のない支援」と言っています。')).toBe(
      "区は「切れ目のない支援」と言っています。"
    );
  });

  it("括弧だけの応答は空にする", () => {
    expect(cleanTranscript("（無音）")).toBe("");
    expect(cleanTranscript("(聞き取れませんでした)")).toBe("");
  });

  it("上限は 5MB", () => {
    expect(MAX_AUDIO_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("pickRecordingMimeType", () => {
  it("対応しているものを優先順に選ぶ", () => {
    expect(pickRecordingMimeType((t) => t.startsWith("audio/webm"))).toBe(
      "audio/webm;codecs=opus"
    );
    expect(pickRecordingMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("どれも対応していなければ undefined", () => {
    expect(pickRecordingMimeType(() => false)).toBeUndefined();
  });
});

describe("appendTranscript", () => {
  it("すでにある入力の後ろに改行して足す", () => {
    expect(appendTranscript("保育園のこと。", " 学童も気になります。 ")).toBe(
      "保育園のこと。\n学童も気になります。"
    );
  });

  it("入力が空ならそのまま入れる", () => {
    expect(appendTranscript("", "学童も気になります。")).toBe(
      "学童も気になります。"
    );
    expect(appendTranscript("  \n", "学童の話。")).toBe("学童の話。");
  });

  it("起こした文字が空なら入力を変えない", () => {
    expect(appendTranscript("保育園のこと。", "   ")).toBe("保育園のこと。");
  });
});
