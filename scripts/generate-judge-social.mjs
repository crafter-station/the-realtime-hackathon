import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as fontkit from "fontkit";
import sharp from "sharp";

const root = process.cwd();
const brandDirectory = path.join(root, "public", "brand-assets");
const outputDirectory = path.join(brandDirectory, "social", "static", "judges");
const portraitDirectory = path.join(
  brandDirectory,
  "sources",
  "portraits",
  "judges",
);
const fontFileName = "GeistPixel-Square.ttf";
const fontDirectories = {
  darwin: path.join(os.homedir(), "Library", "Fonts"),
  linux: path.join(os.homedir(), ".local", "share", "fonts"),
};
const fontDirectory = fontDirectories[process.platform];
const fontPath = fontDirectory && path.join(fontDirectory, fontFileName);
const expectedFontChecksum =
  "c1fbf7316997c1749857708998958e8ca0343416b3f8d2c7156d634a9520e997";
let fontBuffer;
try {
  fontBuffer = await readFile(fontPath);
} catch {}
if (
  !fontBuffer ||
  createHash("sha256").update(fontBuffer).digest("hex") !== expectedFontChecksum
) {
  throw new Error(
    "Install the project font with `bun run font:setup` before generating assets.",
  );
}
const font = fontkit.create(fontBuffer);

const colors = {
  black: "#090909",
  gray: "#8f8f8f",
  orange: "#ff4d00",
  particle: "#b8b8b8",
  white: "#ffffff",
};

function asDataUri(buffer, mediaType) {
  return `data:${mediaType};base64,${buffer.toString("base64")}`;
}

function textPath(
  text,
  { anchor = "start", fill, letterSpacing = 0, size, x, y },
) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  const tracking = size * letterSpacing;
  const textWidth = run.positions.reduce(
    (width, position, index) =>
      width +
      position.xAdvance * scale +
      (index === run.positions.length - 1 ? 0 : tracking),
    0,
  );
  let cursor =
    anchor === "middle"
      ? x - textWidth / 2
      : anchor === "end"
        ? x - textWidth
        : x;

  return run.glyphs
    .map((glyph, index) => {
      const position = run.positions[index];
      const glyphX = cursor + position.xOffset * scale;
      const glyphY = y - position.yOffset * scale;
      cursor += position.xAdvance * scale + tracking;
      return `<path d="${glyph.path.toSVG()}" fill="${fill}" transform="translate(${glyphX.toFixed(3)} ${glyphY.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})"/>`;
    })
    .join("");
}

const portalLogo = (
  await readFile(
    path.join(brandDirectory, "sources", "logos", "portal-master.svg"),
    "utf8",
  )
)
  .replace(/<rect\b[^>]*\/>/, "")
  .replace('viewBox="0 0 1014 1014"', 'viewBox="145 145 725 725"')
  .replace('fill="white"', `fill="${colors.gray}"`);
const crafterStationLogo = (
  await readFile(
    path.join(brandDirectory, "sources", "logos", "crafter-station-master.svg"),
    "utf8",
  )
).replace('fill="#ffffff"', `fill="${colors.gray}"`);

const portalLogoUri = asDataUri(Buffer.from(portalLogo), "image/svg+xml");
const crafterStationLogoUri = asDataUri(
  Buffer.from(crafterStationLogo),
  "image/svg+xml",
);
const particleUri = asDataUri(
  await readFile(
    path.join(brandDirectory, "brand", "artwork", "particle-torus.png"),
  ),
  "image/png",
);

const judges = [
  {
    firstName: "ARTURO",
    image: "arturo-barrantes.png",
    lastName: "BARRANTES",
    roles: ["FOUNDER @ CLOUDFORGE AI"],
    slug: "arturo-barrantes",
  },
  {
    firstName: "MARIA CRISTINA",
    image: "maria-cristina-ruelas.png",
    lastName: "RUELAS",
    roles: ["FOUNDER @ 3DEVLABS"],
    slug: "maria-cristina-ruelas",
  },
  {
    firstName: "VICTOR",
    image: "victor-galvez.png",
    lastName: "GALVEZ",
    roles: ["TECH LEAD @ BCP"],
    slug: "victor-galvez",
  },
];

const width = 1_080;
const height = 1_350;

await mkdir(outputDirectory, { recursive: true });
for (const judge of judges) {
  const portraitUri = asDataUri(
    await readFile(path.join(portraitDirectory, judge.image)),
    "image/png",
  );
  const roles = judge.roles
    .map((role, index) =>
      textPath(role, {
        anchor: "middle",
        fill: colors.particle,
        letterSpacing: 0.1,
        size: 23,
        x: 540,
        y: 1_168 + index * 39,
      }),
    )
    .join("");
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="scanlines" width="1080" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0.5H1080" stroke="${colors.orange}" stroke-width="1" opacity="0.045"/>
        </pattern>
        <linearGradient id="portrait-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${colors.black}" stop-opacity="0"/>
          <stop offset="0.32" stop-color="${colors.black}" stop-opacity="0.12"/>
          <stop offset="0.62" stop-color="${colors.black}" stop-opacity="0.86"/>
          <stop offset="1" stop-color="${colors.black}" stop-opacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="${colors.black}"/>
      <image href="${particleUri}" x="40" y="120" width="1000" height="1000" opacity="0.42"/>
      <image href="${portraitUri}" x="100" y="220" width="880" height="880"/>
      <rect x="0" y="760" width="1080" height="450" fill="url(#portrait-fade)"/>
      <rect width="1080" height="1350" fill="url(#scanlines)"/>

      <image href="${portalLogoUri}" x="64" y="58" width="48" height="48"/>
      <image href="${crafterStationLogoUri}" x="972" y="60" width="44" height="44"/>
      ${textPath("OFFICIAL JUDGE", { anchor: "middle", fill: colors.orange, letterSpacing: 0.12, size: 27, x: 540, y: 172 })}

      ${textPath(judge.firstName, { anchor: "middle", fill: colors.white, letterSpacing: -0.065, size: judge.firstName.length > 10 ? 70 : 86, x: 540, y: 1_010 })}
      ${textPath(judge.lastName, { anchor: "middle", fill: colors.orange, letterSpacing: -0.065, size: 96, x: 540, y: 1_094 })}
      ${roles}

      ${textPath("THE REALTIME HACKATHON", { fill: colors.particle, letterSpacing: 0.1, size: 18, x: 64, y: 1_291 })}
      ${textPath("AUG 07-09 / 36H", { anchor: "end", fill: colors.particle, letterSpacing: 0.1, size: 18, x: 1_016, y: 1_291 })}
    </svg>
  `);

  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
  const outputName = `${judge.slug}-linkedin-4x5`;
  await writeFile(path.join(outputDirectory, `${outputName}.png`), png);
  await sharp(png)
    .webp({ quality: 92, smartSubsample: true })
    .toFile(path.join(outputDirectory, `${outputName}.webp`));
}

console.log(
  `Generated judge social assets in ${path.relative(root, outputDirectory)}`,
);
