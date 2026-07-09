import { Container } from "./container";

/** トップのヒーロー（現行と同じコピー・コーラル系グラデーション） */
export function Hero() {
  return (
    <div className="bg-mirai-gradient relative flex min-h-[420px] items-center lg:min-h-[62vh]">
      <Container>
        <p className="text-xl font-bold leading-relaxed text-mirai-text md:text-2xl">
          いま大田区議会で議論されていること
          <br />
          やさしい言葉で説明します
        </p>
      </Container>

      {/* スクロールインジケーター */}
      <div className="-translate-x-1/2 absolute bottom-8 left-1/2 flex flex-col items-center">
        <div className="h-8 w-px bg-mirai-text" />
        <span className="mt-2 font-lexend text-[10px] text-mirai-text">
          Scroll
        </span>
      </div>
    </div>
  );
}
