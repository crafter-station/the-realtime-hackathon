import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as fontkit from "fontkit";
import sharp from "sharp";

const root = process.cwd();
const outputDirectory = path.join(root, "public", "brand-assets");
const brandDirectory = path.join(outputDirectory, "brand");
const logoDirectory = path.join(brandDirectory, "logos");
const sourceLogoDirectory = path.join(outputDirectory, "sources", "logos");
const fontDirectory = path.join(brandDirectory, "fonts");
const artworkDirectory = path.join(brandDirectory, "artwork");
const emailDirectory = path.join(outputDirectory, "email");
const iconDirectory = path.join(outputDirectory, "web", "icons");
const socialEventDirectory = path.join(
  outputDirectory,
  "social",
  "static",
  "event",
);
const webOpenGraphDirectory = path.join(outputDirectory, "web", "open-graph");
const webListingDirectory = path.join(outputDirectory, "web", "listings");
const appDirectory = path.join(root, "src", "app");
const emailStaticDirectory = path.join(root, "emails", "static");
const fontFamily = "Geist Pixel Square";
const fontFullName = fontFamily;
const expectedFontChecksum =
  "c1fbf7316997c1749857708998958e8ca0343416b3f8d2c7156d634a9520e997";

const resolvedFontFamily = execFileSync("fc-match", [
  "--format=%{fullname}",
  fontFamily,
]).toString();
if (resolvedFontFamily !== fontFullName) {
  throw new Error(
    `Install the project font with \`bun run font:setup\` before generating assets.`,
  );
}
const fontPath = execFileSync("fc-match", [
  "--format=%{file}",
  fontFamily,
]).toString();
const fontBuffer = await readFile(fontPath);
if (
  createHash("sha256").update(fontBuffer).digest("hex") !== expectedFontChecksum
) {
  throw new Error(
    "The installed Geist Pixel Square file does not match the pinned project font. Run `bun run font:setup`.",
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

const portalLogoSource = await readFile(
  path.join(sourceLogoDirectory, "portal-master.svg"),
  "utf8",
);
const crafterStationLogoSource = await readFile(
  path.join(sourceLogoDirectory, "crafter-station-master.svg"),
  "utf8",
);
const portalLogoData = Buffer.from(
  portalLogoSource
    .replace(/<rect\b[^>]*\/>/, "")
    .replace('viewBox="0 0 1014 1014"', 'viewBox="145 145 725 725"')
    .replace('fill="white"', `fill="${colors.gray}"`),
).toString("base64");

function svgDocument(width, height, content, extraStyles = "") {
  if (content.includes("<text")) {
    throw new Error(
      "Brand artwork must convert text to Geist Pixel glyph paths before rendering.",
    );
  }

  const styles = extraStyles.trim()
    ? `<style>${extraStyles.trim()}</style>`
    : "";
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${styles}${content.trim()}</svg>\n`,
  );
}

function wordmarkArtwork(foreground) {
  const width = 900;
  const height = 400;
  const content = `
    <title>The Realtime Hackathon</title>
    ${textPath("THE", { anchor: "middle", fill: foreground, letterSpacing: -0.075, size: 132, x: width / 2, y: 125 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 132, x: width / 2, y: 245 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: foreground, letterSpacing: -0.075, size: 132, x: width / 2, y: 365 })}
  `;

  return svgDocument(width, height, content);
}

function portalMarkArtwork(fill) {
  return Buffer.from(
    portalLogoSource
      .replace(/<rect\b[^>]*\/>/, "")
      .replace('fill="white"', `fill="${fill}"`),
  );
}

function crafterStationMarkArtwork(fill) {
  return Buffer.from(
    crafterStationLogoSource.replace('fill="#ffffff"', `fill="${fill}"`),
  );
}

async function writeLogoAsset(fileName, svg, width, height) {
  await writeFile(path.join(logoDirectory, `${fileName}.svg`), svg);
  const raster = sharp(svg).resize(width, height);
  await Promise.all([
    raster
      .clone()
      .png({ compressionLevel: 9 })
      .toFile(path.join(logoDirectory, `${fileName}.png`)),
    raster
      .clone()
      .webp({ lossless: true })
      .toFile(path.join(logoDirectory, `${fileName}.webp`)),
  ]);
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

function seededRandom(seed) {
  let value = seed | 0;
  return () => {
    value = (Math.imul(value, 1_664_525) + 1_013_904_223) | 0;
    return (value >>> 0) / 4_294_967_296;
  };
}

function particleArtwork() {
  const width = 1_600;
  const height = 1_600;
  const random = seededRandom(0x2f6e2b1);
  const particles = [];
  const fullTurn = Math.PI * 2;
  const rotationX = -0.075;
  const rotationY = 0.588;
  const rotationZ = 0.011;

  for (let index = 0; index < 6_800; index += 1) {
    const cloudY = random() * 2 - 1;
    const cloudAngle = random() * fullTurn;
    const cloudRadius = 3.2 + random() ** 0.38 * 3.5;
    const cloudWidth = Math.sqrt(1 - cloudY * cloudY);
    const cloud = {
      x: Math.cos(cloudAngle) * cloudWidth * cloudRadius * 1.18,
      y: cloudY * cloudRadius * 0.78,
      z: Math.sin(cloudAngle) * cloudWidth * cloudRadius,
    };

    const around = random() * fullTurn;
    const tube = random() * fullTurn;
    const majorRadius = 1.25 + (random() - 0.5) * 0.045;
    const tubeRadius = 0.32 + (random() - 0.5) * 0.055;
    const target = {
      x: (majorRadius + tubeRadius * Math.cos(tube)) * Math.cos(around),
      y: (majorRadius + tubeRadius * Math.cos(tube)) * Math.sin(around),
      z: tubeRadius * Math.sin(tube),
    };

    random(); // Delay, consumed to preserve the component's seeded sequence.
    random(); // Phase.
    const size = 0.8 + random() * 1.35;
    const morph = index % 19 === 0 ? 0.78 : 0.96;
    let x = cloud.x * (1 - morph) + target.x * morph;
    let y = cloud.y * (1 - morph) + target.y * morph;
    let z = cloud.z * (1 - morph) + target.z * morph;

    [y, z] = [
      y * Math.cos(rotationX) - z * Math.sin(rotationX),
      y * Math.sin(rotationX) + z * Math.cos(rotationX),
    ];
    [x, z] = [
      x * Math.cos(rotationY) + z * Math.sin(rotationY),
      -x * Math.sin(rotationY) + z * Math.cos(rotationY),
    ];
    [x, y] = [
      x * Math.cos(rotationZ) - y * Math.sin(rotationZ),
      x * Math.sin(rotationZ) + y * Math.cos(rotationZ),
    ];

    const perspective = 9.2 / (9.2 - z);
    const screenX = width / 2 + x * 390 * perspective;
    const screenY = height / 2 - y * 390 * perspective;
    const pixelSize = Math.max(1.2, size * 1.45 * perspective);
    const opacity = Math.min(0.92, 0.38 + perspective * 0.33);
    const color = index % 97 === 0 ? colors.orange : colors.particle;

    particles.push(
      `<rect x="${screenX.toFixed(2)}" y="${screenY.toFixed(2)}" width="${pixelSize.toFixed(2)}" height="${pixelSize.toFixed(2)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`,
    );
  }

  return svgDocument(width, height, particles.join(""));
}

function background(width, height) {
  return `
    <defs>
      <pattern id="mesh" width="${width}" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 0.5H${width}" stroke="${colors.orange}" stroke-width="1" opacity="0.045"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="${colors.black}"/>
    <rect width="${width}" height="${height}" fill="url(#mesh)"/>
  `;
}

function imageTag(particleData, x, y, size, opacity = 1) {
  return `<image href="data:image/png;base64,${particleData}" x="${x}" y="${y}" width="${size}" height="${size}" opacity="${opacity}"/>`;
}

function portalLogo(x, y, size) {
  return `<image href="data:image/svg+xml;base64,${portalLogoData}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}

function crafterStationLogo(x, y, size, color = colors.white) {
  return `
    <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 257 257" aria-label="Crafter Station">
      <path d="M116.419 16.3268C109.59 11.5679 97.9222 5.96914 90.2388 3.72965C72.8798 -1.58913 59.1794 1.40491 50.114 4.56947C32.4704 10.7281 21.3721 18.8462 11.412 33.6828C-4.23949 56.6375 -1.96292 93.869 17.1035 114.864C21.3721 119.903 23.6487 119.063 40.1539 107.026C40.723 106.466 38.4465 102.827 35.0316 98.6278C27.3481 89.11 22.7949 71.754 25.0715 61.9563C32.4704 31.1634 70.3187 14.6472 94.7919 31.4433C100.199 35.0825 117.273 50.199 132.64 65.0356C155.691 86.8706 162.52 91.9094 168.212 91.3496C173.903 90.7897 175.895 88.8301 176.464 82.6715C177.318 75.9531 174.757 72.034 161.667 60.2767C152.845 52.1585 145.731 44.8802 145.731 43.4805C145.731 42.3608 151.707 37.6019 159.105 33.1229C206.914 3.1698 258.421 62.7961 218.581 101.987C213.459 107.026 204.353 112.345 198.377 114.024C191.547 115.704 159.959 117.104 120.688 117.104C47.2683 117.104 43.2842 117.943 23.9332 135.02C-0.824636 157.134 -6.51609 194.926 10.8429 222.359C33.3241 258.191 81.7016 267.149 115.85 241.675L128.372 232.157L142.885 241.675C166.504 257.351 185.571 260.431 208.621 252.872C254.722 237.476 271.796 179.809 241.916 141.178C238.501 136.979 236.794 136.699 232.241 138.939C218.297 146.777 218.581 146.217 226.834 163.013C233.094 175.89 234.233 180.929 232.81 190.727C228.826 215.361 210.044 231.877 186.14 231.877C167.643 231.877 161.667 228.238 127.518 195.486C109.59 178.689 93.0845 164.693 90.8079 164.693C86.5393 164.693 77.433 173.371 77.433 177.57C77.433 178.689 85.1165 187.647 94.7919 197.165L112.151 214.241L101.906 222.08C65.7655 249.233 14.2578 216.761 26.2098 174.211C29.9093 161.333 42.9996 147.057 55.5209 142.578C60.3586 140.618 90.2388 139.498 130.648 139.498C204.922 139.498 213.744 138.099 230.818 123.542C281.757 80.9919 252.161 0.930299 185.571 1.21023C166.22 1.21023 155.691 5.12933 137.762 18.2863L128.656 25.0048L116.419 16.3268Z" fill="${color}"/>
    </svg>
  `;
}

function iconSvg(size) {
  return Buffer.from(
    portalLogoSource.replace(
      'width="1014" height="1014"',
      `width="${size}" height="${size}"`,
    ),
  );
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = Buffer.alloc(images.length * 16);
  let offset = header.length + entries.length;

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = index * 16;
    entries.writeUInt8(size === 256 ? 0 : size, entryOffset);
    entries.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(buffer.length, entryOffset + 8);
    entries.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([
    header,
    entries,
    ...images.map(({ buffer }) => buffer),
  ]);
}

async function render(name, width, height, content, options = {}) {
  const png = await sharp(svgDocument(width, height, content))
    .png({ compressionLevel: 9, palette: options.palette ?? false })
    .toBuffer();
  await writeFile(path.join(outputDirectory, `${name}.png`), png);

  if (options.webp) {
    await sharp(png)
      .webp({ quality: 92, smartSubsample: true })
      .toFile(path.join(outputDirectory, `${name}.webp`));
  }

  return png;
}

await Promise.all(
  [
    artworkDirectory,
    emailDirectory,
    emailStaticDirectory,
    fontDirectory,
    iconDirectory,
    logoDirectory,
    socialEventDirectory,
    webListingDirectory,
    webOpenGraphDirectory,
  ].map((directory) => mkdir(directory, { recursive: true })),
);

for (const [mode, foreground] of [
  ["dark", colors.white],
  ["light", colors.black],
]) {
  await Promise.all([
    writeLogoAsset(
      `realtime-hackathon-wordmark-${mode}`,
      wordmarkArtwork(foreground),
      1_800,
      800,
    ),
    writeLogoAsset(
      `portal-${mode}`,
      portalMarkArtwork(foreground),
      1_024,
      1_024,
    ),
    writeLogoAsset(
      `crafter-station-${mode}`,
      crafterStationMarkArtwork(foreground),
      1_024,
      1_024,
    ),
  ]);
}

const particlePng = await sharp(particleArtwork())
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(path.join(artworkDirectory, "particle-torus.png"), particlePng);
const particleData = particlePng.toString("base64");

await sharp(particlePng)
  .resize(1_200, 360, { fit: "cover", position: "centre" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(emailDirectory, "signal.png"));

await sharp(Buffer.from(crafterStationLogoSource))
  .resize(64, 64)
  .png({ compressionLevel: 9 })
  .toFile(path.join(emailDirectory, "crafter-station-64.png"));

await render(
  "web/open-graph/event",
  1_200,
  630,
  `
    ${background(1_200, 630)}
    ${imageTag(particleData, 318, 12, 600, 0.94)}
    ${portalLogo(65, 48, 34)}
    ${textPath("THE", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 82, x: 600, y: 225 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 82, x: 600, y: 309 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 82, x: 600, y: 393 })}
    ${textPath("BUILD AI THAT HAPPENS NOW", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 33, x: 600, y: 465 })}
    ${textPath("US$800 PRIZES", { fill: colors.particle, letterSpacing: 0.12, size: 18, x: 65, y: 571 })}
    ${textPath("AUG 07-09  /  36H", { anchor: "end", fill: colors.particle, letterSpacing: 0.12, size: 18, x: 1_135, y: 571 })}
    ${crafterStationLogo(1_101, 48, 34, colors.gray)}
  `,
  { webp: true },
);

await render(
  "web/listings/luma-event-square",
  1_080,
  1_080,
  `
    ${background(1_080, 1_080)}
    ${imageTag(particleData, 98, 65, 940, 0.68)}
    ${portalLogo(56, 48, 48)}
    ${textPath("THE", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 112, x: 540, y: 420 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 112, x: 540, y: 545 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 112, x: 540, y: 670 })}
    ${textPath("AUG 07-09", { anchor: "middle", fill: colors.particle, letterSpacing: 0.12, size: 32, x: 540, y: 938 })}
    ${crafterStationLogo(976, 48, 48, colors.gray)}
  `,
  { webp: true },
);

await render(
  "social/static/event/linkedin-feed-4x5",
  1_080,
  1_350,
  `
    ${background(1_080, 1_350)}
    ${imageTag(particleData, 100, 202, 936, 0.98)}
    ${portalLogo(64, 58, 42)}
    ${textPath("THE", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 132, x: 540, y: 565 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 132, x: 540, y: 681 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 132, x: 540, y: 797 })}
    ${textPath("BUILD AI THAT HAPPENS NOW", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 44, x: 540, y: 875 })}
    ${textPath("US$800 PRIZES", { fill: colors.particle, letterSpacing: 0.12, size: 26, x: 64, y: 1_282 })}
    ${textPath("AUG 07-09  /  36H", { anchor: "end", fill: colors.particle, letterSpacing: 0.12, size: 26, x: 1_016, y: 1_282 })}
    ${crafterStationLogo(974, 58, 42, colors.gray)}
  `,
  { webp: true },
);

await render(
  "social/static/event/x-feed-4x5",
  1_200,
  1_500,
  `
    ${background(1_200, 1_500)}
    ${imageTag(particleData, 111, 224, 1_040, 0.98)}
    ${portalLogo(71, 64, 47)}
    ${textPath("THE", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 147, x: 600, y: 628 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 147, x: 600, y: 757 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 147, x: 600, y: 886 })}
    ${textPath("BUILD AI THAT HAPPENS NOW", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 49, x: 600, y: 972 })}
    ${textPath("US$800 PRIZES", { fill: colors.particle, letterSpacing: 0.12, size: 29, x: 71, y: 1_424 })}
    ${textPath("AUG 07-09  /  36H", { anchor: "end", fill: colors.particle, letterSpacing: 0.12, size: 29, x: 1_129, y: 1_424 })}
    ${crafterStationLogo(1_082, 64, 47, colors.gray)}
  `,
  { webp: true },
);

await render(
  "social/static/event/instagram-feed-4x5",
  1_080,
  1_350,
  `
    ${background(1_080, 1_350)}
    ${imageTag(particleData, 100, 202, 936, 0.98)}
    ${portalLogo(64, 58, 42)}
    ${textPath("THE", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 132, x: 540, y: 565 })}
    ${textPath("REALTIME", { anchor: "middle", fill: colors.orange, letterSpacing: -0.075, size: 132, x: 540, y: 681 })}
    ${textPath("HACKATHON", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 132, x: 540, y: 797 })}
    ${textPath("BUILD AI THAT HAPPENS NOW", { anchor: "middle", fill: colors.white, letterSpacing: -0.075, size: 44, x: 540, y: 875 })}
    ${textPath("US$800 PRIZES", { fill: colors.particle, letterSpacing: 0.12, size: 26, x: 64, y: 1_282 })}
    ${textPath("AUG 07-09  /  36H", { anchor: "end", fill: colors.particle, letterSpacing: 0.12, size: 26, x: 1_016, y: 1_282 })}
    ${crafterStationLogo(974, 58, 42, colors.gray)}
  `,
  { webp: true },
);

const iconSizes = [16, 32, 64, 180, 192, 512];
const icons = new Map();
for (const size of iconSizes) {
  const png = await sharp(iconSvg(size))
    .png({ compressionLevel: 9 })
    .toBuffer();
  icons.set(size, png);
  const name = size === 180 ? "apple-touch-icon" : `portal-${size}`;
  await writeFile(path.join(iconDirectory, `${name}.png`), png);
}

const favicon = createIco(
  [16, 32, 64].map((size) => ({ size, buffer: icons.get(size) })),
);
await writeFile(path.join(iconDirectory, "favicon.ico"), favicon);
await writeFile(path.join(appDirectory, "favicon.ico"), favicon);
await writeFile(path.join(appDirectory, "icon.png"), icons.get(512));
await writeFile(path.join(appDirectory, "apple-icon.png"), icons.get(180));
await copyFile(
  path.join(appDirectory, "fonts", "geist-pixel-latin.woff2"),
  path.join(fontDirectory, "geist-pixel-latin.woff2"),
);

for (const fileName of [
  "brand/fonts/geist-pixel-latin.woff2",
  "email/crafter-station-64.png",
  "email/signal.png",
  "web/icons/portal-64.png",
]) {
  const destination = path.join(emailStaticDirectory, fileName);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(outputDirectory, fileName), destination);
}

const manifest = {
  palette: colors,
  files: {
    "brand/artwork/particle-torus.png": "1600x1600",
    "brand/fonts/geist-pixel-latin.woff2": "Geist Pixel Latin web font",
    "brand/logos/crafter-station-dark.png": "1024x1024",
    "brand/logos/crafter-station-dark.svg":
      "1024x1024 vector mark for dark mode",
    "brand/logos/crafter-station-dark.webp": "1024x1024",
    "brand/logos/crafter-station-light.png": "1024x1024",
    "brand/logos/crafter-station-light.svg":
      "1024x1024 vector mark for light mode",
    "brand/logos/crafter-station-light.webp": "1024x1024",
    "brand/logos/portal-dark.png": "1024x1024",
    "brand/logos/portal-dark.svg": "1014x1014 vector mark for dark mode",
    "brand/logos/portal-dark.webp": "1024x1024",
    "brand/logos/portal-light.png": "1024x1024",
    "brand/logos/portal-light.svg": "1014x1014 vector mark for light mode",
    "brand/logos/portal-light.webp": "1024x1024",
    "brand/logos/realtime-hackathon-wordmark-dark.png": "1800x800",
    "brand/logos/realtime-hackathon-wordmark-dark.svg":
      "900x400 vector wordmark for dark mode",
    "brand/logos/realtime-hackathon-wordmark-dark.webp": "1800x800",
    "brand/logos/realtime-hackathon-wordmark-light.png": "1800x800",
    "brand/logos/realtime-hackathon-wordmark-light.svg":
      "900x400 vector wordmark for light mode",
    "brand/logos/realtime-hackathon-wordmark-light.webp": "1800x800",
    "email/crafter-station-64.png": "64x64",
    "email/signal.png": "1200x360",
    "social/static/event/instagram-feed-4x5.png": "1080x1350",
    "social/static/event/instagram-feed-4x5.webp": "1080x1350",
    "social/static/event/linkedin-feed-4x5.png": "1080x1350",
    "social/static/event/linkedin-feed-4x5.webp": "1080x1350",
    "social/static/event/x-feed-4x5.png": "1200x1500",
    "social/static/event/x-feed-4x5.webp": "1200x1500",
    "social/static/judges/arturo-barrantes-linkedin-4x5.png": "1080x1350",
    "social/static/judges/arturo-barrantes-linkedin-4x5.webp": "1080x1350",
    "social/static/judges/maria-cristina-ruelas-linkedin-4x5.png": "1080x1350",
    "social/static/judges/maria-cristina-ruelas-linkedin-4x5.webp": "1080x1350",
    "social/static/judges/victor-galvez-linkedin-4x5.png": "1080x1350",
    "social/static/judges/victor-galvez-linkedin-4x5.webp": "1080x1350",
    "social/static/mentors/arturo-barrantes-linkedin-4x5.png": "1080x1350",
    "social/static/mentors/arturo-barrantes-linkedin-4x5.webp": "1080x1350",
    "social/static/mentors/david-morales-norato-linkedin-4x5.png": "1080x1350",
    "social/static/mentors/david-morales-norato-linkedin-4x5.webp": "1080x1350",
    "social/static/mentors/ignacio-velasquez-linkedin-4x5.png": "1080x1350",
    "social/static/mentors/ignacio-velasquez-linkedin-4x5.webp": "1080x1350",
    "social/static/mentors/marcelo-arias-linkedin-4x5.png": "1080x1350",
    "social/static/mentors/marcelo-arias-linkedin-4x5.webp": "1080x1350",
    "social/video/instagram/event-poster-4x5.mp4": "1080x1350",
    "social/video/instagram/schedule-4x5.mp4": "1080x1350",
    "sources/portraits/judges/arturo-barrantes.png": "Judge portrait source",
    "sources/portraits/judges/maria-cristina-ruelas.png":
      "Judge portrait source",
    "sources/portraits/judges/victor-galvez.png": "Judge portrait source",
    "sources/portraits/mentors/arturo-barrantes.png": "Mentor portrait source",
    "sources/portraits/mentors/david-morales-norato.png":
      "Mentor portrait source",
    "sources/portraits/mentors/ignacio-velasquez.png": "Mentor portrait source",
    "sources/portraits/mentors/marcelo-arias.png": "Mentor portrait source",
    "sources/logos/crafter-station-master.svg": "Crafter Station vector source",
    "sources/logos/portal-master.svg": "Portal vector source",
    "web/icons/apple-touch-icon.png": "180x180",
    "web/icons/favicon.ico": "16x16, 32x32, 64x64",
    "web/icons/portal-16.png": "16x16",
    "web/icons/portal-32.png": "32x32",
    "web/icons/portal-64.png": "64x64",
    "web/icons/portal-192.png": "192x192",
    "web/icons/portal-512.png": "512x512",
    "web/listings/luma-event-square.png": "1080x1080",
    "web/listings/luma-event-square.webp": "1080x1080",
    "web/open-graph/event.png": "1200x630",
    "web/open-graph/event.webp": "1200x630",
  },
};
await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Generated brand assets in ${path.relative(root, outputDirectory)}`,
);
