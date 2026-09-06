// Writes public/passport/nick/qr.svg: the QR code for the slide that sends the
// audience to Nick's live Ability Passport.   Run: npx tsx scripts/make-qr.tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { SITE_URL } from "../src/lib/site";

const url = `${SITE_URL}/nick`;
const svg = renderToStaticMarkup(
  createElement(QRCodeSVG, {
    value: url,
    size: 1024,
    level: "M",
    marginSize: 4,
    bgColor: "#ffffff",
    fgColor: "#172d1c",
    title: `QR code that opens ${url}`,
  }),
);
mkdirSync("public/passport/nick", { recursive: true });
writeFileSync("public/passport/nick/qr.svg", `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log(`wrote public/passport/nick/qr.svg for ${url}`);
