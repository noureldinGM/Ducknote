import { Download, Smartphone, Mic, Heart, Bell } from "lucide-react";

const APK_URL = "/DuckNote-v1.0.0.apk";

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#FFF7F8] text-[#24131A]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Brand */}
          <div className="mb-8">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-5xl shadow-lg ring-1 ring-rose-100">
              🦆
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              DuckNote
            </h1>

            <p className="mt-4 text-lg font-medium text-[#8A737B] sm:text-xl">
              Private notes. Just between you.
            </p>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#8A737B] sm:text-base">
              Send personal text and audio notes directly to someone you care
              about.
            </p>
          </div>

          {/* Download card */}
          <section className="rounded-[32px] bg-white p-6 shadow-xl ring-1 ring-rose-100 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#FFF7F8] p-4">
                <Smartphone className="mx-auto h-6 w-6 text-rose-500" />
                <p className="mt-2 text-xs font-bold text-[#24131A]">
                  Android
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF7F8] p-4">
                <Mic className="mx-auto h-6 w-6 text-rose-500" />
                <p className="mt-2 text-xs font-bold text-[#24131A]">
                  Audio Notes
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF7F8] p-4">
                <Heart className="mx-auto h-6 w-6 text-rose-500" />
                <p className="mt-2 text-xs font-bold text-[#24131A]">
                  Reactions
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFF7F8] p-4">
                <Bell className="mx-auto h-6 w-6 text-rose-500" />
                <p className="mt-2 text-xs font-bold text-[#24131A]">
                  Notifications
                </p>
              </div>
            </div>

            <div className="mt-8">
              <a
                href={APK_URL}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-6 py-4 text-base font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.98] sm:w-auto sm:min-w-[280px]"
              >
                <Download className="h-5 w-5" />
                Download for Android
              </a>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#8A737B]">
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>Android APK</span>
              </div>
            </div>
          </section>

          {/* Installation note */}
          <p className="mx-auto mt-6 max-w-xl text-xs leading-5 text-[#8A737B]">
            DuckNote v1.0.0 is currently distributed directly as an APK and is
            not available through Google Play.
          </p>

          <a
            href="https://github.com/nourTRYTOIMPROVE/Ducknote/releases/tag/v1.0.0"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-xs font-bold text-rose-500 underline underline-offset-4 hover:text-rose-600"
          >
            View release details on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}