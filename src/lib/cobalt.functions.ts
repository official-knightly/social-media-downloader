import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  url: z.string().url().max(2000),
  quality: z.enum(["max", "2160", "1440", "1080", "720", "480", "360", "240", "144"]),
  mode: z.enum(["auto", "audio", "mute"]),
});

export type GrabResult =
  | { ok: true; items: { url: string; filename?: string; type: string; thumb?: string }[] }
  | { ok: false; error: string };

export const grabMedia = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<GrabResult> => {
    const base = process.env["COBALT_API_URL"];
    const key = process.env["COBALT_API_KEY"];
    if (!base) return { ok: false, error: "Download server isn't set up yet." };
    const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    if (key) headers["Authorization"] = `Api-Key ${key}`;
    try {
      const res = await fetch(base.replace(/\/$/, "") + "/", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: data.url, videoQuality: data.quality, downloadMode: data.mode, audioFormat: "mp3", filenameStyle: "pretty" }),
      });
      const j = (await res.json()) as {
        status: string; url?: string; filename?: string;
        picker?: { type: string; url: string; thumb?: string }[];
        error?: { code?: string };
      };
      if ((j.status === "tunnel" || j.status === "redirect") && j.url)
        return { ok: true, items: [{ url: j.url, filename: j.filename, type: data.mode === "audio" ? "audio" : "video" }] };
      if (j.status === "picker" && j.picker?.length)
        return { ok: true, items: j.picker.map((p) => ({ url: p.url, type: p.type, thumb: p.thumb })) };
      console.error("cobalt error", j);
      return { ok: false, error: friendly(j.error?.code) };
    } catch (e) {
      console.error("cobalt fetch failed", e);
      return { ok: false, error: "Couldn't reach the download server. Try again." };
    }
  });

function friendly(code?: string) {
  if (!code) return "Something went wrong. Try another link.";
  if (code.includes("link")) return "That link isn't supported or is broken.";
  if (code.includes("unavailable") || code.includes("private")) return "This post is private or unavailable.";
  if (code.includes("auth")) return "The download server rejected the key.";
  if (code.includes("rate")) return "Too many requests — wait a moment.";
  return "Couldn't get this post (" + code + ").";
}
