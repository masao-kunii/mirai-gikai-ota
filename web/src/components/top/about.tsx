import Image from "next/image";

export function About() {
  return (
    <div className="py-10">
      <div className="flex flex-col gap-4">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4">
          <h2>
            <Image
              src="/icons/about-typography.svg"
              alt="About"
              width={143}
              height={36}
              priority
            />
          </h2>
          <p className="text-sm font-bold text-primary-accent">
            みらい議会＠大田区とは
          </p>
        </div>

        {/* コンテンツ */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold leading-[43.2px]">
              議会での議論を
              <br />
              できる限りわかりやすく
            </h3>
            <p className="text-[15px] leading-[28px] text-black">
              みらい議会＠大田区は、大田区議会で今どんな議案が検討されているか、わかりやすく伝えるプラットフォームです。区民の意見を政治に届けることを目指して、継続的にアップデートしていく、有志個人による非公式プロジェクトです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
