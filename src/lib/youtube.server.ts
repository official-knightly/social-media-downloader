// In-app YouTube extractor: asks YouTube's player API (as the VR app client) for direct stream links.
const CLIENT = {
  clientName: "ANDROID_VR", clientVersion: "1.62.27", deviceMake: "Oculus", deviceModel: "Quest 3",
  androidSdkVersion: 32, osName: "Android", osVersion: "12L", hl: "en",
};
const UA = "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";

export function youtubeId(input: string): string | null {
  const u = new URL(input);
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  if (host === "youtu.be") return u.pathname.slice(1, 12) || null;
  if (host !== "youtube.com") return null;
  const v = u.searchParams.get("v");
  if (v) return v;
  const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
  return m?.[2] ?? null;
}

type Fmt = { itag: number; url?: string; mimeType: string; height?: number; bitrate?: number; contentLength?: string };

export async function youtubeStream(id: string, audio: boolean) {
  const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ videoId: id, context: { client: CLIENT }, contentCheckOk: true, racyCheckOk: true }),
  });
  if (!r.ok) throw new Error("blocked");
  const j = await r.json() as { playabilityStatus?: { status?: string }; videoDetails?: { title?: string }; streamingData?: { formats?: Fmt[]; adaptiveFormats?: Fmt[] } };
  if (j.playabilityStatus?.status !== "OK") throw new Error("unavailable");
  const title = (j.videoDetails?.title ?? "video").replace(/[^\w\- ]+/g, "").trim().slice(0, 80) || "video";
  const sd = j.streamingData ?? {};
  let pick: Fmt | undefined;
  if (audio) {
    pick = (sd.adaptiveFormats ?? []).filter((f) => f.url && f.mimeType.startsWith("audio/mp4")).sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
  } else {
    pick = (sd.formats ?? []).filter((f) => f.url).sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
  }
  if (!pick?.url) throw new Error("nostream");
  const ext = audio ? "m4a" : "mp4";
  const media = await fetch(pick.url, { headers: { "User-Agent": UA } });
  if (!media.ok || !media.body) throw new Error("stream");
  const headers = new Headers({
    "Content-Type": audio ? "audio/mp4" : "video/mp4",
    "Content-Disposition": `attachment; filename="${title}.${ext}"`,
    "Cache-Control": "no-store",
  });
  const len = media.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new Response(media.body, { status: 200, headers });
}
