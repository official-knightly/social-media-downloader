import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GrabIt — Bouncy Social Media Downloader" },
      { name: "description", content: "Paste any YouTube, Instagram, TikTok, X, Facebook or Pinterest link and grab it." },
      { property: "og:title", content: "GrabIt — Bouncy Social Media Downloader" },
      { property: "og:description", content: "Paste a link, pick a format, grab the post." },
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
const FORMATS = ["MP4 1080p", "MP4 720p", "MP3 Audio", "Thumbnail"];

function detect(url: string) {
  return PLATFORMS.find((p) => p.re.test(url.toLowerCase()));
}
function ytThumb(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

type Item = { url: string; platform: string; emoji: string; at: number };

function Index() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
  const [result, setResult] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Item[]>([]);

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem("grab-history") || "[]"));
  }, []);

  const found = detect(url);

  async function paste() {
    try { setUrl(await navigator.clipboard.readText()); } catch { setError("Clipboard blocked — paste manually"); }
  }

  function grab() {
    setError(""); setResult(null);
    if (!/^https?:\/\//.test(url) || !found) return setError("Hmm, that link doesn't look supported 🤔");
    setLoading(true);
    setTimeout(() => {
      const item = { url, platform: found.name, emoji: found.emoji, at: Date.now() };
      setResult(item);
      const h = [item, ...history.filter((x) => x.url !== url)].slice(0, 8);
      setHistory(h); localStorage.setItem("grab-history", JSON.stringify(h));
      setLoading(false);
    }, 900);
  }

  // Opens a public downloader service for the actual file.
  const downloadHref = (u: string) => `https://cobalt.tools/#${encodeURIComponent(u)}`;
  const thumb = result && ytThumb(result.url);

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <header className="text-center animate-bounce-in">
        <div className="text-6xl animate-wobble inline-block">⬇️</div>
        <h1 className="font-display text-5xl sm:text-7xl mt-2 text-primary [text-shadow:4px_4px_0_var(--border)]">GrabIt!</h1>
        <p className="mt-3 font-semibold text-muted-foreground">Paste a link. Pick a format. Boing — it's yours.</p>
      </header>

      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {PLATFORMS.map((p, i) => (
          <span key={p.name} style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-bounce-in brutal rounded-full px-3 py-1 text-sm font-bold ${found?.name === p.name ? "bg-secondary scale-110" : "bg-card"}`}>
            {p.emoji} {p.name}
          </span>
        ))}
      </div>

      <section className="brutal bg-card rounded-lg p-5 mt-8 animate-bounce-in" style={{ animationDelay: "200ms" }}>
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && grab()}
            placeholder="https://youtube.com/watch?v=..." className="brutal rounded-lg flex-1 min-w-0 px-4 py-3 bg-background outline-none font-semibold" />
          <button onClick={paste} className="brutal press rounded-lg px-3 bg-accent font-bold">📋</button>
        </div>
        {found && <p className="mt-2 text-sm font-bold animate-bounce-in">{found.emoji} Detected: {found.name}</p>}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {FORMATS.map((f) => (
            <button key={f} onClick={() => setFormat(f)}
              className={`brutal press rounded-lg py-2 font-bold text-sm ${format === f ? "bg-secondary" : "bg-background"}`}>{f}</button>
          ))}
        </div>
        <button onClick={grab} disabled={loading}
          className="brutal press w-full mt-4 rounded-lg py-4 bg-primary text-primary-foreground font-display text-2xl">
          {loading ? <span className="inline-block animate-bounce">⏳ Fetching…</span> : "GRAB IT 🚀"}
        </button>
        {error && <p className="mt-3 font-bold text-primary animate-bounce-in">{error}</p>}
      </section>

      {result && (
        <section className="brutal bg-secondary rounded-lg p-5 mt-6 animate-bounce-in">
          {thumb && <img src={thumb} alt="Video thumbnail" className="brutal rounded-lg w-full mb-4" />}
          <p className="font-display text-xl">{result.emoji} {result.platform} ready!</p>
          <p className="text-sm break-all mt-1">{result.url}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href={format === "Thumbnail" && thumb ? thumb : downloadHref(result.url)} target="_blank" rel="noreferrer"
              className="brutal press rounded-lg px-4 py-2 bg-primary text-primary-foreground font-bold">⬇️ Download {format}</a>
            <button onClick={() => navigator.clipboard.writeText(result.url)} className="brutal press rounded-lg px-4 py-2 bg-card font-bold">🔗 Copy</button>
            {navigator.share && <button onClick={() => navigator.share({ url: result.url })} className="brutal press rounded-lg px-4 py-2 bg-accent font-bold">📤 Share</button>}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-2xl">Recent grabs</h2>
            <button onClick={() => { setHistory([]); localStorage.removeItem("grab-history"); }} className="text-sm font-bold underline">Clear</button>
          </div>
          <ul className="mt-3 space-y-2">
            {history.map((h, i) => (
              <li key={h.at} style={{ animationDelay: `${i * 70}ms` }} className="animate-bounce-in">
                <button onClick={() => setUrl(h.url)} className="brutal press bg-card rounded-lg w-full text-left px-4 py-2 truncate font-semibold text-sm">
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
