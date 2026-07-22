import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BRAND,
  BrandTexture,
  clamp,
  FONT_FAMILY,
  MOTION,
  PartnerMarks,
  RegistrationEndCard,
} from "./brand";
import { ParticleDonut } from "./particle-donut";

export const POSTER_DURATION_IN_FRAMES = 450;

function RevealLine({
  children,
  color = BRAND.white,
  delay,
  size,
}: {
  children: string;
  color?: string;
  delay: number;
  size: number;
}) {
  const frame = useCurrentFrame();
  const reveal = interpolate(
    frame,
    [delay, delay + MOTION.primaryReveal],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <div style={{ overflow: "hidden" }}>
      <div
        style={{
          color,
          fontSize: size,
          letterSpacing: "-0.065em",
          lineHeight: 0.82,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 72}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function EventPoster() {
  const frame = useCurrentFrame();
  const detailsReveal = interpolate(
    frame,
    [220, 220 + MOTION.primaryReveal],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const sceneOpacity = interpolate(
    frame,
    [360, 360 + MOTION.sceneExit],
    [1, 0],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const partnerMarksOpacity = interpolate(
    frame,
    [130, 130 + MOTION.secondaryReveal],
    [0, 0.62],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <AbsoluteFill
      style={{
        background: BRAND.black,
        color: BRAND.white,
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        <ParticleDonut mode="poster" />
        <BrandTexture />
        <PartnerMarks opacity={partnerMarksOpacity} />

        <div
          style={{
            left: 35,
            position: "absolute",
            right: 35,
            textAlign: "center",
            top: 430,
          }}
        >
          <RevealLine delay={112} size={94}>
            THE
          </RevealLine>
          <RevealLine color={BRAND.orange} delay={134} size={128}>
            REALTIME
          </RevealLine>
          <RevealLine delay={156} size={112}>
            HACKATHON
          </RevealLine>

          <div
            style={{
              fontSize: 31,
              letterSpacing: "-0.035em",
              marginTop: 35,
              opacity: detailsReveal,
              transform: `translateY(${(1 - detailsReveal) * 18}px)`,
            }}
          >
            BUILD AI THAT HAPPENS NOW
          </div>
        </div>

        <div
          style={{
            bottom: 145,
            display: "flex",
            fontSize: 26,
            justifyContent: "space-between",
            left: 64,
            letterSpacing: "0.045em",
            opacity: detailsReveal,
            position: "absolute",
            right: 64,
          }}
        >
          <span>US$800 PRIZES</span>
          <span>AUG 07-09 / 39H</span>
        </div>
      </AbsoluteFill>
      <RegistrationEndCard startFrame={390} />
    </AbsoluteFill>
  );
}
