import { ImageResponse } from "next/og";

export const alt = "Olmo: wood-fired kitchen in Bristol";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadGloock(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Gloock&text=Olmo.CkdvrBgtpWfi", { headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" } })).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await loadGloock();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ECE4D3",
          color: "#26301F",
          fontFamily: font ? "Gloock" : "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: 720 }}>
          <div style={{ fontSize: 56, display: "flex" }}>Olmo</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 88, lineHeight: 1.02, display: "flex" }}>Cooked over oak.</div>
            <div style={{ fontSize: 88, lineHeight: 1.02, display: "flex" }}>Booked in three taps.</div>
          </div>
          <div style={{ fontSize: 28, display: "flex", fontFamily: "sans-serif", color: "#5C6B3C" }}>Wood-fired kitchen, Bristol</div>
        </div>
        <div style={{ display: "flex", flex: 1, background: "#1A1714", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 340, height: 340, borderRadius: 340, background: "#D89A2B", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 230, height: 230, borderRadius: 230, background: "#1A1714", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Gloock", data: font, style: "normal", weight: 400 }] : undefined },
  );
}
