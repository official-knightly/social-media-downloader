import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { grabMedia, type GrabResult } from "@/lib/cobalt.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GrabIt — Bouncy Social Media Downloader" },
      { name: "description", content: "Paste any YouTube, Instagram, TikTok, X, Facebook or Pinterest link and download it in your chosen quality." },
      { property: "og:title", content: "GrabIt — Bouncy Social Media Downloader" },
      { property: "og:description", content: "Paste a link, pick a resolution, download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;600;700&display=swap" }],
  }),
  component: Index,
});

const PLATFORMS = [
  { name: "YouTube", emoji: "▶️", re: /youtu\.?be/ },
  { name: "Instagram", emoji: "📸", re: /instagram\.com/ },
  { name: "TikTok", emoji: "🎵", re: /tiktok\.com/ },
  { name: "X / Twitter", emoji: "🐦", re: /(twitter|x)\.com/ },
  { name: "Facebook", emoji: "📘", re: /(facebook|fb)\.(com|watch)/ },
  { name: "Pinterest", emoji: "📌", re: /pin(terest)?\.(com|it)/ },
  { name: "Reddit", emoji: "👽", re: /reddit\.com/ },
  { name: "Vimeo", emoji: "🎬", re: /vimeo\.com/ },
];
const OPTIONS = [
  { label: "Best", quality: "max", mode: "auto" },
  { label: "1080p", quality: "1080", mode: "auto" },
  { label: "720p", quality: "720", mode: "auto" },
  { label: "480p", quality: "480", mode: "auto" },
  { label: "360p", quality: "360", mode: "auto" },
  { label: "🎧 MP3", quality: "max", mode: "audio" },
] as const;

const detect = (u: string) => PLATFORMS.find((p) => p.re.test(u.toLowerCase()));
const ytThumb = (u: string) => {
  const m = u.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
};

type Hist = { url: string; emoji: string; at: number };

function Index() {
  const grab = useServerFn(grabMedia);
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"paste" | "pick">("paste");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<GrabResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Hist[]>([]);

  useEffect(() => setHistory(JSON.parse(localStorage.getItem("grab-history") || "[]")), []);
  const found = detect(url);
  const thumb = ytThumb(url);

  async function paste() {
    try { setUrl(await navigator.clipboard.readText()); } catch { setError("Clipboard blocked — paste manually"); }
  }

  function start() {
    setError(""); setResult(null);
    if (!/^https?:\/\//.test(url.trim()) || !found) return setError("Hmm, that link doesn't look supported 🤔");
    setStep("pick");
  }

  async function pick(o: (typeof OPTIONS)[number]) {
    setLoading(o.label); setError(""); setResult(null);
    const r = await grab({ data: { url: url.trim(), quality: o.quality, mode: o.mode } });
    setLoading(null);
    if (!r.ok) return setError(r.error);
    setResult(r);
    const h = [{ url: url.trim(), emoji: found!.emoji, at: Date.now() }, ...history.filter((x) => x.url !== url.trim())].slice(0, 8);
    setHistory(h); localStorage.setItem("grab-history", JSON.stringify(h));
  }

  function reset() { setUrl(""); setStep("paste"); setResult(null); setError(""); }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <header className="text-center animate-bounce-in">
        <div className="text-6xl animate-wobble inline-block">⬇️</div>
        <h1 className="font-display text-5xl sm:text-7xl mt-2 text-primary [text-shadow:4px_4px_0_var(--border)]">GrabIt!</h1>
        <p className="mt-3 font-semibold text-muted-foreground">Paste. Pick quality. Boing — it's yours.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {PLATFORMS.map((p, i) => (
          <span key={p.name} style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-bounce-in brutal rounded-full px-3 py-1 text-sm font-bold ${found?.name === p.name ? "bg-secondary" : "bg-card"}`}>
            {p.emoji} {p.name}
          </span>
        ))}
      </div>

      <section className="brutal bg-card rounded-lg p-5 mt-8 animate-bounce-in">
        <div className="flex gap-2">
          <input value={url} onChange={(e) => { setUrl(e.target.value); setStep("paste"); setResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && start()}
            placeholder="Paste link here…" className="brutal rounded-lg flex-1 min-w-0 px-4 py-3 bg-background outline-none font-semibold" />
          <button onClick={paste} aria-label="Paste" className="brutal press rounded-lg px-3 bg-accent font-bold">📋</button>
        </div>
        {found && <p className="mt-2 text-sm font-bold animate-bounce-in">{found.emoji} {found.name} link</p>}
        {step === "paste" && (
          <button onClick={start} className="brutal press w-full mt-4 rounded-lg py-4 bg-primary text-primary-foreground font-display text-2xl">
            DOWNLOAD 🚀
          </button>
        )}
        {error && <p className="mt-3 font-bold text-primary animate-bounce-in">{error}</p>}
      </section>

      {step === "pick" && (
        <section className="brutal bg-accent rounded-lg p-5 mt-6 animate-bounce-in">
          {thumb && <img src={thumb} alt="Video preview" className="brutal rounded-lg w-full mb-4" />}
          <h2 className="font-display text-xl">Pick a resolution</h2>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {OPTIONS.map((o, i) => (
              <button key={o.label} onClick={() => pick(o)} disabled={!!loading} style={{ animationDelay: `${i * 60}ms` }}
                className="animate-bounce-in brutal press rounded-lg py-3 bg-card font-bold disabled:opacity-60">
                {loading === o.label ? <span className="inline-block animate-bounce">⏳</span> : o.label}
              </button>
            ))}
          </div>

          {result?.ok && (
            <div className="mt-5 space-y-2">
              {result.items.map((it, i) => (
                <a key={i} href={it.url} download={it.filename} target="_blank" rel="noreferrer"
                  className="animate-bounce-in brutal press flex items-center gap-3 rounded-lg px-4 py-3 bg-primary text-primary-foreground font-bold">
                  {it.thumb && <img src={it.thumb} alt="" className="w-10 h-10 rounded object-cover" />}
                  <span className="truncate">⬇️ Save {it.filename || `${it.type} ${result.items.length > 1 ? i + 1 : ""}`}</span>
                </a>
              ))}
              <button onClick={reset} className="w-full font-bold underline text-sm pt-2">Grab another</button>
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl">Recent</h2>
            <button onClick={() => { setHistory([]); localStorage.removeItem("grab-history"); }} className="text-sm font-bold underline">Clear</button>
          </div>
          <ul className="mt-3 space-y-2">
            {history.map((h) => (
              <li key={h.at}>
                <button onClick={() => { setUrl(h.url); setStep("pick"); setResult(null); }}
                  className="brutal press bg-card rounded-lg w-full text-left px-4 py-2 truncate font-semibold text-sm">
                  {h.emoji} {h.url}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-xs text-muted-foreground mt-12">Only download content you own or have permission to use.</footer>
    </main>
  );
}
