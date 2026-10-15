import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * IBM Plex Sans Arabic (the storefront's Arabic typeface, SIL Open Font License) embedded in the PDF.
 * The font comes as two files per weight, Arabic glyphs and Latin glyphs, so each weight is registered
 * under two families and text asks for both: Latin first, Arabic (which also holds the Arabic-Indic
 * digits) as the fallback. The files live in assets/fonts, converted to TTF because the PDF library
 * can't read the WOFF the npm package ships.
 */
const dir = path.join(process.cwd(), "assets", "fonts", "ibm-plex-sans-arabic");
const file = (script: "arabic" | "latin", weight: 400 | 700) =>
  path.join(dir, `ibm-plex-sans-arabic-${script}-${weight}-normal.ttf`);

export const PDF_FONT = ["PlexLatin", "PlexArabic"];

let registered = false;
export function registerPdfFonts() {
  if (registered) return;
  for (const [family, script] of [
    ["PlexArabic", "arabic"],
    ["PlexLatin", "latin"],
  ] as const) {
    Font.register({
      family,
      fonts: [
        { src: file(script, 400), fontWeight: 400 },
        { src: file(script, 700), fontWeight: 700 },
      ],
    });
  }
  // never break a word: Arabic letters join, so a hyphen in the middle would be wrong
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
