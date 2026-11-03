import { describe, expect, it } from "vitest";
import { DOWNLOAD_SERVICE, downloadRequest } from "@/lib/download";

describe("Hosted downloader", () => {
  it("uses the user's Render service", () => {
    expect(DOWNLOAD_SERVICE).toBe("https://yt-downloader-backened.onrender.com");
  });
  it("requests the selected resolution", () => {
    expect(downloadRequest({ url: "https://youtu.be/jNQXAC9IVRw", quality: "720", mode: "auto" })).toEqual({ url: "https://youtu.be/jNQXAC9IVRw", quality: "720", format: "mp4" });
  });
  it("maps best quality and audio to the hosted contract", () => {
    expect(downloadRequest({ url: "https://youtu.be/jNQXAC9IVRw", quality: "max", mode: "audio" })).toEqual({ url: "https://youtu.be/jNQXAC9IVRw", quality: "best", format: "mp3" });
  });
});