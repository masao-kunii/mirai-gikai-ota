/**
 * `ai` SDK の streamText / generateText / generateObject / streamObject の
 * 薄いラッパー。`model` 引数に文字列が渡された場合は `getModel()` で
 * Vertex AI Gemini のモデルオブジェクトに自動解決する。
 *
 * 既存の `ai` パッケージから他のシンボル（型・ヘルパー等）を re-export して
 * いるので、callsite では `from "ai"` を `from "@mirai-gikai/shared/ai/sdk"`
 * に置き換えるだけで Vertex AI に切り替わる。
 */
import {
  generateObject as _generateObject,
  generateText as _generateText,
  streamObject as _streamObject,
  streamText as _streamText,
  type LanguageModel,
} from "ai";
import { getModel } from "./get-model";

type WithModel = { model?: LanguageModel | string };

function resolveOptions<T extends WithModel>(opts: T): T {
  if (typeof opts.model === "string") {
    return { ...opts, model: getModel(opts.model) };
  }
  return opts;
}

export const streamText: typeof _streamText = ((opts: Parameters<
  typeof _streamText
>[0]) => _streamText(resolveOptions(opts))) as typeof _streamText;

export const generateText: typeof _generateText = ((opts: Parameters<
  typeof _generateText
>[0]) => _generateText(resolveOptions(opts))) as typeof _generateText;

export const generateObject: typeof _generateObject = ((opts: Parameters<
  typeof _generateObject
>[0]) => _generateObject(resolveOptions(opts))) as typeof _generateObject;

export const streamObject: typeof _streamObject = ((opts: Parameters<
  typeof _streamObject
>[0]) => _streamObject(resolveOptions(opts))) as typeof _streamObject;

// `ai` パッケージの他の export（型・ヘルパー）はそのまま再公開する
export * from "ai";
