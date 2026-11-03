export type GrabResult =
  | { ok: true; items: { url: string; filename?: string; type: string; thumb?: string }[] }
  | { ok: false; error: string };

export const DOWNLOAD_SERVICE = "https://yt-downloader-backened.onrender.com";

export function downloadRequest(data: { url: string; quality: string; mode: string }) {
  return { url: data.url, quality: data.quality === "max" ? "best" : data.quality, format: data.mode === "audio" ? "mp3" : "mp4" };
}

export async function grabMedia(data: { url: string; quality: string; mode: string }): Promise<GrabResult> {
  try {
    const response = await fetch("/api/download", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(downloadRequest(data)), signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "Your hosted downloader requires an API key. Ask the owner to connect it securely.",
        403: "Your hosted downloader denied this request.",
        422: "Your hosted downloader couldn't download this post. It may be blocked, private, unavailable, or unsupported.",
        429: "Your hosted downloader is busy or has reached its request limit. Wait before trying again.",
        504: "Your hosted downloader took too long. It may be waking up; try again shortly.",
      };
      return { ok: false, error: messages[response.status] ?? "Your hosted downloader is unavailable. Try again shortly." };
    }
    if (response.headers.get("content-type")?.includes("application/json")) {
      const body = await response.json() as { url?: string; download_url?: string; filename?: string };
      const rawUrl = body.download_url ?? body.url;
      if (!rawUrl) return { ok: false, error: "Your hosted downloader didn't return a file or download link." };
      const url = new URL(rawUrl, DOWNLOAD_SERVICE);
      if (!["https:", "http:"].includes(url.protocol)) return { ok: false, error: "Your hosted downloader returned an invalid download link." };
      return { ok: true, items: [{ url: url.href, filename: body.filename, type: data.mode === "audio" ? "audio" : "video" }] };
    }
    const blob = await response.blob();
    if (!blob.size) return { ok: false, error: "Your hosted downloader returned an empty file." };
    const disposition = response.headers.get("content-disposition") ?? "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `GrabIt.${data.mode === "audio" ? "mp3" : "mp4"}`;
    return { ok: true, items: [{ url: URL.createObjectURL(blob), filename, type: data.mode === "audio" ? "audio" : "video" }] };
  } catch {
    return { ok: false, error: "Couldn't finish the download. Your hosted downloader may be waking up; try again shortly." };
  }
}