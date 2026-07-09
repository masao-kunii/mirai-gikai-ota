/** みらい議会＠大田区 の紹介セクション（現行 About と同文言） */
export function AboutSection() {
  return (
    <section className="flex flex-col gap-4 py-10">
      <div className="flex flex-col gap-4">
        <img
          src="/icons/about-typography.svg"
          alt="About"
          width={143}
          height={36}
          className="h-9 w-auto"
        />
        <p className="text-sm font-bold text-primary-accent">
          みらい議会＠大田区とは
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="whitespace-pre-line text-2xl font-bold leading-[1.8] text-mirai-text">
            {"議会での議論を\nできる限りわかりやすく"}
          </h3>
          <p className="text-[15px] leading-[1.87] text-mirai-text">
            みらい議会＠大田区は、大田区議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです。区民の意見を政治に届けることを目指して、継続的にアップデートしていく、有志個人による非公式プロジェクトです。
          </p>
        </div>
      </div>
    </section>
  );
}
