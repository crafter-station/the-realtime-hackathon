import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

export const BRAND = {
  black: "#090909",
  gray: "#8f8f8f",
  orange: "#ff4d00",
  particle: "#b8b8b8",
  white: "#ffffff",
} as const;

export const FONT_FAMILY = "Geist Pixel";

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const MOTION = {
  primaryReveal: 24,
  secondaryReveal: 18,
  rowEnter: 12,
  deEmphasis: 8,
  sceneExit: 18,
} as const;

void loadFont({
  family: FONT_FAMILY,
  url: staticFile("brand-assets/geist-pixel-latin.woff2"),
  format: "woff2",
});

export function BrandTexture() {
  return (
    <div
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,77,0,0.035) 0, rgba(255,77,0,0.035) 1px, transparent 1px, transparent 5px)",
        inset: 0,
        pointerEvents: "none",
        position: "absolute",
      }}
    />
  );
}

export function PartnerMarks({ opacity = 0.62 }: { opacity?: number }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
        left: 64,
        opacity,
        position: "absolute",
        right: 64,
        top: 52,
      }}
    >
      <Img
        src={staticFile("brand-assets/logo-portal.svg")}
        style={{ height: 48, objectFit: "cover", width: 48 }}
      />
      <Img
        src={staticFile("brand-assets/crafter-station-icon-dark.svg")}
        style={{ height: 44, width: 44 }}
      />
    </div>
  );
}

export function RegistrationEndCard({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const reveal = interpolate(
    frame,
    [startFrame, startFrame + MOTION.primaryReveal],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: BRAND.black,
        display: "flex",
        justifyContent: "center",
        opacity: reveal,
        textAlign: "center",
      }}
    >
      <div style={{ transform: `translateY(${(1 - reveal) * 24}px)` }}>
        <div style={{ color: BRAND.orange, fontSize: 62, marginBottom: 18 }}>
          REGISTER FREE
        </div>
        <div
          style={{
            color: BRAND.white,
            fontSize: 34,
            letterSpacing: "0.045em",
          }}
        >
          HACK.USEPORTAL.CO
        </div>
      </div>
    </AbsoluteFill>
  );
}
