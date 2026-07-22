import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDirectory = path.join(root, "public", "brand-assets");
const appDirectory = path.join(root, "src", "app");
const fontFamily = "Geist Pixel";
const fontFullName = "Geist Pixel Regular";

const resolvedFontFamily = execFileSync("fc-match", [
  "--format=%{fullname}",
  fontFamily,
]).toString();
if (resolvedFontFamily !== fontFullName) {
  throw new Error(
    `Install the project ${fontFamily} font before generating assets.`,
  );
}

const colors = {
  black: "#090909",
  gray: "#8f8f8f",
  orange: "#ff4d00",
  particle: "#b8b8b8",
  white: "#ffffff",
};

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function svgDocument(width, height, content, extraStyles = "") {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <style>
        text { font-family: "${fontFamily}"; font-style: normal; font-weight: 400; }
        .title { fill: ${colors.white}; font-weight: 700; letter-spacing: -0.075em; }
        .label { fill: ${colors.particle}; font-weight: 700; letter-spacing: 0.12em; }
        .orange { fill: ${colors.orange}; }
        ${extraStyles}
      </style>
      ${content}
    </svg>
  `);
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

function crafterStationLogo(x, y, size) {
  return `
    <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 257 257" aria-label="Crafter Station">
      <path d="M116.419 16.3268C109.59 11.5679 97.9222 5.96914 90.2388 3.72965C72.8798 -1.58913 59.1794 1.40491 50.114 4.56947C32.4704 10.7281 21.3721 18.8462 11.412 33.6828C-4.23949 56.6375 -1.96292 93.869 17.1035 114.864C21.3721 119.903 23.6487 119.063 40.1539 107.026C40.723 106.466 38.4465 102.827 35.0316 98.6278C27.3481 89.11 22.7949 71.754 25.0715 61.9563C32.4704 31.1634 70.3187 14.6472 94.7919 31.4433C100.199 35.0825 117.273 50.199 132.64 65.0356C155.691 86.8706 162.52 91.9094 168.212 91.3496C173.903 90.7897 175.895 88.8301 176.464 82.6715C177.318 75.9531 174.757 72.034 161.667 60.2767C152.845 52.1585 145.731 44.8802 145.731 43.4805C145.731 42.3608 151.707 37.6019 159.105 33.1229C206.914 3.1698 258.421 62.7961 218.581 101.987C213.459 107.026 204.353 112.345 198.377 114.024C191.547 115.704 159.959 117.104 120.688 117.104C47.2683 117.104 43.2842 117.943 23.9332 135.02C-0.824636 157.134 -6.51609 194.926 10.8429 222.359C33.3241 258.191 81.7016 267.149 115.85 241.675L128.372 232.157L142.885 241.675C166.504 257.351 185.571 260.431 208.621 252.872C254.722 237.476 271.796 179.809 241.916 141.178C238.501 136.979 236.794 136.699 232.241 138.939C218.297 146.777 218.581 146.217 226.834 163.013C233.094 175.89 234.233 180.929 232.81 190.727C228.826 215.361 210.044 231.877 186.14 231.877C167.643 231.877 161.667 228.238 127.518 195.486C109.59 178.689 93.0845 164.693 90.8079 164.693C86.5393 164.693 77.433 173.371 77.433 177.57C77.433 178.689 85.1165 187.647 94.7919 197.165L112.151 214.241L101.906 222.08C65.7655 249.233 14.2578 216.761 26.2098 174.211C29.9093 161.333 42.9996 147.057 55.5209 142.578C60.3586 140.618 90.2388 139.498 130.648 139.498C204.922 139.498 213.744 138.099 230.818 123.542C281.757 80.9919 252.161 0.930299 185.571 1.21023C166.22 1.21023 155.691 5.12933 137.762 18.2863L128.656 25.0048L116.419 16.3268Z" fill="${colors.white}"/>
    </svg>
  `;
}

function heading(lines, x, y, size, lineHeight, orangeLine = -1) {
  return lines
    .map(
      (line, index) =>
        `<text class="title${index === orangeLine ? " orange" : ""}" x="${x}" y="${y + index * lineHeight}" font-size="${size}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function iconSvg(size) {
  const border = Math.max(2, Math.round(size * 0.065));
  return svgDocument(
    size,
    size,
    `
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${colors.black}"/>
      <rect x="${border / 2}" y="${border / 2}" width="${size - border}" height="${size - border}" rx="${Math.round(size * 0.065)}" fill="none" stroke="${colors.orange}" stroke-width="${border}"/>
      <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="${Math.round(size * 0.47)}" font-weight="700" letter-spacing="-0.09em" fill="${colors.white}">P<tspan fill="${colors.orange}">/</tspan></text>
    `,
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

await mkdir(outputDirectory, { recursive: true });

const particlePng = await sharp(particleArtwork())
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(path.join(outputDirectory, "particle-torus.png"), particlePng);
const particleData = particlePng.toString("base64");

const og = await render(
  "og-image",
  1_200,
  630,
  `
    ${background(1_200, 630)}
    ${imageTag(particleData, 574, -60, 760, 0.94)}
    <rect x="65" y="357" width="408" height="2" fill="${colors.orange}"/>
    ${heading(["THE", "REALTIME", "HACKATHON"], 65, 120, 72, 78, 1)}
    <text class="title" x="66" y="425" font-size="39">BUILD AI THAT</text>
    <text class="title" x="66" y="469" font-size="39">HAPPENS NOW.</text>
    <text class="label" x="68" y="570" font-size="21">AUG 07-09 2026  /  ONLINE</text>
    ${crafterStationLogo(1_122, 48, 34)}
  `,
  { webp: true },
);
await writeFile(path.join(root, "public", "og.png"), og);

await render(
  "luma-square",
  1_080,
  1_080,
  `
    ${background(1_080, 1_080)}
    ${imageTag(particleData, 98, 65, 940, 0.68)}
    <text class="title" x="540" y="420" text-anchor="middle" font-size="112">THE</text>
    <text class="title orange" x="540" y="545" text-anchor="middle" font-size="112">REALTIME</text>
    <text class="title" x="540" y="670" text-anchor="middle" font-size="112">HACKATHON</text>
    <text class="label" x="540" y="938" text-anchor="middle" font-size="32">AUG 07-09 2026</text>
    <text class="label" x="540" y="992" text-anchor="middle" font-size="25">ONLINE</text>
    ${crafterStationLogo(976, 48, 48)}
  `,
  { webp: true },
);

await render(
  "linkedin-post",
  1_200,
  627,
  `
    ${background(1_200, 627)}
    ${imageTag(particleData, 610, -17, 664, 0.94)}
    <text class="label" x="65" y="78" font-size="21">ONLINE  /  AUG 07-09 2026</text>
    ${heading(["THE", "REALTIME", "HACKATHON"], 64, 162, 82, 84, 1)}
    <text class="title" x="65" y="402" font-size="33">BUILD AI THAT HAPPENS NOW.</text>
    <rect x="65" y="437" width="470" height="2" fill="${colors.orange}"/>
    <text class="label" x="65" y="481" font-size="16">39 HOURS</text>
    <text class="label" x="65" y="518" font-size="16">US$800 CASH PRIZES  /  REGISTER FREE</text>
    <text class="label" x="65" y="568" font-size="14">LUMA.COM/REALTIME-HACKATHON</text>
    ${crafterStationLogo(1_122, 48, 36)}
  `,
  { webp: true },
);

await render(
  "instagram-post",
  1_080,
  1_350,
  `
    ${background(1_080, 1_350)}
    ${imageTag(particleData, 100, 202, 936, 0.98)}
    <text class="title" x="540" y="190" text-anchor="middle" font-size="112">THE</text>
    <text class="title orange" x="540" y="306" text-anchor="middle" font-size="112">REALTIME</text>
    <text class="title" x="540" y="422" text-anchor="middle" font-size="112">HACKATHON</text>
    <text class="title" x="540" y="490" text-anchor="middle" font-size="34">BUILD AI THAT HAPPENS NOW.</text>
    <text class="label" x="540" y="790" text-anchor="middle" font-size="25">AUG 07-09 2026  /  ONLINE</text>
    <text class="label" x="540" y="845" text-anchor="middle" font-size="22">39 HOURS  /  US$800 PRIZES</text>
    <text class="label orange" x="64" y="1282" font-size="17">REGISTER FREE</text>
    <text class="label orange" x="1016" y="1282" text-anchor="end" font-size="17">LUMA.COM/REALTIME-HACKATHON</text>
    ${crafterStationLogo(970, 58, 42)}
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
  const name = size === 180 ? "apple-touch-icon" : `icon-${size}`;
  await writeFile(path.join(outputDirectory, `${name}.png`), png);
}

const favicon = createIco(
  [16, 32, 64].map((size) => ({ size, buffer: icons.get(size) })),
);
await writeFile(path.join(outputDirectory, "favicon.ico"), favicon);
await writeFile(path.join(appDirectory, "favicon.ico"), favicon);
await writeFile(path.join(appDirectory, "icon.png"), icons.get(512));
await writeFile(path.join(appDirectory, "apple-icon.png"), icons.get(180));

const manifest = {
  palette: colors,
  files: {
    "og-image.png": "1200x630",
    "og-image.webp": "1200x630",
    "luma-square.png": "1080x1080",
    "luma-square.webp": "1080x1080",
    "linkedin-post.png": "1200x627",
    "linkedin-post.webp": "1200x627",
    "instagram-post.png": "1080x1350",
    "instagram-post.webp": "1080x1350",
    "particle-torus.png": "1600x1600",
    "favicon.ico": "16x16, 32x32, 64x64",
    "apple-touch-icon.png": "180x180",
    "icon-192.png": "192x192",
    "icon-512.png": "512x512",
  },
};
await writeFile(
  path.join(outputDirectory, "assets.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Generated brand assets in ${path.relative(root, outputDirectory)}`,
);
