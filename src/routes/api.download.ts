import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DOWNLOAD_SERVICE } from "@/lib/download";

const Input = z.object({
  url: z.string().url().max(2048).refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.com|fb\.watch|pinterest\.com|pin\.it|reddit\.com|vimeo\.com)$/.test(url.hostname);
  }),
  quality: z.enum(["best", "2160", "1440", "1080", "720", "480", "360", "240", "144"]),
  format: z.enum(["mp4", "mp3"]),
});

export const Route = createFileRoute("/api/download")({
  server: { handlers: { POST: async ({ request }) => {
    const data = Input.safeParse(await request.json().catch(() => null));
    if (!data.success) return Response.json({ error: "Invalid download request" }, { status: 400 });
    const { youtubeId, youtubeStream } = await import("@/lib/youtube.server");
    const ytId = youtubeId(data.data.url);
    if (ytId) {
      try {
        return await youtubeStream(ytId, data.data.format === "mp3");
      } catch {
        // fall through to the hosted downloader
      }
    }
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = process.env["DOWNLOADER_API_KEY"];
    if (key) headers["x-api-key"] = key;
    try {
      const response = await fetch(`${DOWNLOAD_SERVICE}/api/download`, {
        method: "POST", headers, body: JSON.stringify(data.data), signal: AbortSignal.timeout(175_000),
      });
      const outgoing = new Headers({ "Cache-Control": "no-store" });
      for (const name of ["content-type", "content-disposition"]) {
        const value = response.headers.get(name);
        if (value) outgoing.set(name, value);
      }
      return new Response(response.body, { status: response.status, headers: outgoing });
    } catch {
      return Response.json({ error: "Downloader unavailable" }, { status: 504 });
    }
  } } },
});