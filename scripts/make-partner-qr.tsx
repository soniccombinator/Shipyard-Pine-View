// Run: npx tsx scripts/make-partner-qr.tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import sharp from "sharp";
import { PARTNER_FORM_URL } from "../src/lib/site";

const svg = renderToStaticMarkup(
  createElement(QRCodeSVG, {
    value: PARTNER_FORM_URL,
    size: 1480,
    level: "M",
    marginSize: 4,
    bgColor: "#ffffff",
    fgColor: "#172d1c",
    title: "ConnectAble partner interest form",
  }),
);

mkdirSync("public/partner", { recursive: true });
writeFileSync("public/partner/interest-qr.svg", `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log(`Wrote public/partner/interest-qr.svg for ${PARTNER_FORM_URL}`);

// Use the image renderer installed with Next.js for the matching PNG download.
sharp(Buffer.from(svg)).png().toFile("public/partner/interest-qr.png")
  .then(() => console.log("Wrote public/partner/interest-qr.png"))
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
