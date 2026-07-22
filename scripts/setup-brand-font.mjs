import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const fontVersion = "v1.7.2";
const fontFileName = "GeistPixel-Square.ttf";
const fontUrl = `https://raw.githubusercontent.com/vercel/geist-font/${fontVersion}/fonts/GeistPixel/ttf/${fontFileName}`;
const expectedChecksum =
  "c1fbf7316997c1749857708998958e8ca0343416b3f8d2c7156d634a9520e997";

const fontDirectories = {
  darwin: path.join(os.homedir(), "Library", "Fonts"),
  linux: path.join(os.homedir(), ".local", "share", "fonts"),
};
const fontDirectory = fontDirectories[process.platform];

if (!fontDirectory) {
  throw new Error(
    `Automatic font setup is not supported on ${process.platform}. Install Geist Pixel Square from ${fontUrl}.`,
  );
}

try {
  execFileSync("fc-match", ["--version"], { stdio: "ignore" });
} catch {
  throw new Error(
    "fontconfig is required. Install it with `brew install fontconfig` on macOS or your Linux package manager, then rerun this command.",
  );
}

const fontPath = path.join(fontDirectory, fontFileName);
await mkdir(fontDirectory, { recursive: true });

let installedChecksum;
try {
  installedChecksum = createHash("sha256")
    .update(await readFile(fontPath))
    .digest("hex");
} catch {}

if (installedChecksum === expectedChecksum) {
  console.log(`Font already installed at ${fontPath}`);
} else {
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Could not download ${fontUrl}: ${response.status}`);
  }

  const font = Buffer.from(await response.arrayBuffer());
  const checksum = createHash("sha256").update(font).digest("hex");
  if (checksum !== expectedChecksum) {
    throw new Error(`Downloaded font checksum did not match ${fontVersion}.`);
  }

  await writeFile(fontPath, font);
  console.log(`Installed ${fontFileName} at ${fontPath}`);
}

execFileSync("fc-cache", ["-f", fontDirectory], { stdio: "inherit" });

const resolvedFont = execFileSync("fc-match", [
  "--format=%{fullname}",
  "Geist Pixel Square",
]).toString();
if (resolvedFont !== "Geist Pixel Square") {
  throw new Error(
    `Font setup completed, but fontconfig resolved ${resolvedFont}.`,
  );
}

console.log("Geist Pixel Square is ready for brand asset generation.");
