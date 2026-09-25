import { describe, expect, it } from "vitest";
import {
  parseSokuhouFilename,
  parseSokuhouLabel,
  parseSokuhouPage,
} from "./parse-sokuhou-page";

const PAGE =
  "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.html";

describe("parseSokuhouFilename", () => {
  it("令和の年・月・日から西暦の日付を求める", () => {
    expect(parseSokuhouFilename("080625")).toBe("2026-06-25");
    expect(parseSokuhouFilename("071207")).toBe("2025-12-07");
  });

  it("形式が違う・月日が範囲外なら null", () => {
    expect(parseSokuhouFilename("80625")).toBeNull();
    expect(parseSokuhouFilename("081325")).toBeNull();
    expect(parseSokuhouFilename("080600")).toBeNull();
    expect(parseSokuhouFilename("000625")).toBeNull();
    expect(parseSokuhouFilename("gikai")).toBeNull();
  });
});

describe("parseSokuhouLabel", () => {
  it("会期名・第N日を取り出し、タイトルからファイルサイズの注記を除く", () => {
    expect(
      parseSokuhouLabel(
        "令和8年第2回定例会（第3日）令和8年6月25日（PDF：630KB）"
      )
    ).toEqual({
      title: "令和8年第2回定例会（第3日）令和8年6月25日",
      sessionName: "令和8年第2回定例会",
      dayNumber: 3,
    });
  });

  it("臨時会で第N日が無いものは dayNumber が null", () => {
    expect(
      parseSokuhouLabel("令和8年第2回臨時会　令和8年7月21日（PDF：409KB）")
    ).toEqual({
      title: "令和8年第2回臨時会 令和8年7月21日",
      sessionName: "令和8年第2回臨時会",
      dayNumber: null,
    });
  });

  it("桁区切りのあるサイズ表記や半角括弧も除く", () => {
    expect(
      parseSokuhouLabel("令和8年第2回定例会(第2日)（PDF：1,164KB）").title
    ).toBe("令和8年第2回定例会(第2日)");
  });

  it("会期名が読み取れなければ null", () => {
    expect(parseSokuhouLabel("お知らせ（PDF：10KB）").sessionName).toBeNull();
  });
});

describe("parseSokuhouPage", () => {
  const html = `
    <ul>
      <li><a href="honkaigirokusokuhouban.files/080721.pdf">令和8年第2回臨時会&nbsp;令和8年7月21日（PDF：409KB）</a></li>
      <li><a class="pdf" href="./honkaigirokusokuhouban.files/080625.pdf"><span>令和8年第2回定例会（第3日）</span>令和8年6月25日（PDF：630KB）</a></li>
      <li><a href="honkaigirokusokuhouban.files/080625.pdf">重複リンク</a></li>
      <li><a href="honkaigirokusokuhouban.files/manual.pdf">利用の手引き（PDF：20KB）</a></li>
      <li><a href="/gikai/other.html">PDF ではないリンク</a></li>
    </ul>`;

  it("PDF リンクを絶対 URL にし、会議日と会期名を付けて返す", () => {
    expect(parseSokuhouPage(html, PAGE)).toEqual([
      {
        title: "令和8年第2回臨時会 令和8年7月21日",
        pdfUrl:
          "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080721.pdf",
        meetingDate: "2026-07-21",
        dayNumber: null,
        sessionName: "令和8年第2回臨時会",
      },
      {
        title: "令和8年第2回定例会（第3日）令和8年6月25日",
        pdfUrl:
          "https://www.city.ota.tokyo.jp/gikai/kugikai_katsudou/honkaigirokusokuhouban.files/080625.pdf",
        meetingDate: "2026-06-25",
        dayNumber: 3,
        sessionName: "令和8年第2回定例会",
      },
    ]);
  });

  it("日付として読めないファイル名の PDF は除く", () => {
    expect(
      parseSokuhouPage(html, PAGE).some((m) => m.pdfUrl.includes("manual"))
    ).toBe(false);
  });

  it("リンクが無ければ空配列", () => {
    expect(parseSokuhouPage("<p>準備中</p>", PAGE)).toEqual([]);
  });
});
