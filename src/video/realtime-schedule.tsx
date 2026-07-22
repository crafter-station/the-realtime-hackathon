import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { eventSchedule } from "../lib/event-schedule";
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

export const VIDEO_FPS = 30;
export const SCHEDULE_DURATION_IN_FRAMES = 540;

const LABEL_START_FRAME = 132;
const LABEL_INTERVAL = 55;

const timeline = eventSchedule
  .flatMap((day) =>
    day.items.map(([time, label]) => ({
      date: `${day.day} / ${day.date}`,
      label,
      sortKey: `${day.isoDate}T${time}:00-05:00`,
      time,
    })),
  )
  .toSorted((a, b) => a.sortKey.localeCompare(b.sortKey));

function TimelineEvent({
  event,
  index,
}: {
  event: (typeof timeline)[number];
  index: number;
}) {
  const frame = useCurrentFrame();
  const enterFrame = LABEL_START_FRAME + index * LABEL_INTERVAL;
  const focusEnd = enterFrame + LABEL_INTERVAL + 7;
  const enter = interpolate(
    frame,
    [enterFrame, enterFrame + MOTION.rowEnter],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const rest = interpolate(
    frame,
    [focusEnd, focusEnd + MOTION.deEmphasis],
    [1, 0.36],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const isCurrent = frame >= enterFrame && frame < focusEnd;

  return (
    <div
      style={{
        alignItems: "center",
        display: "grid",
        gap: 22,
        gridTemplateColumns: "178px 1fr",
        minHeight: 104,
        opacity: enter * rest,
        transform: `translate3d(0, ${(1 - enter) * 24}px, 0)`,
      }}
    >
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            color: isCurrent ? BRAND.orange : BRAND.gray,
            fontSize: 20,
            letterSpacing: "0.04em",
            marginBottom: 5,
          }}
        >
          {event.date}
        </div>
        <div
          style={{
            color: isCurrent ? BRAND.white : BRAND.gray,
            fontSize: 42,
            letterSpacing: "-0.035em",
          }}
        >
          {event.time}
        </div>
      </div>
      <div
        style={{
          color: isCurrent ? BRAND.white : BRAND.gray,
          fontSize: isCurrent ? 37 : 33,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          maxWidth: 690,
        }}
      >
        {event.label}
      </div>
    </div>
  );
}

function ScheduleHeading() {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [92, 92 + MOTION.primaryReveal], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity: reveal,
        textAlign: "center",
        transform: `translateY(${(1 - reveal) * 24}px)`,
        width: "100%",
      }}
    >
      <div
        style={{
          color: BRAND.orange,
          fontSize: 27,
          letterSpacing: "0.12em",
          marginBottom: 8,
        }}
      >
        AUG 07-09 / LIMA UTC-5
      </div>
      <h1
        style={{
          fontSize: 82,
          fontWeight: 400,
          letterSpacing: "-0.055em",
          lineHeight: 0.9,
          margin: 0,
        }}
      >
        EVENT SCHEDULE
      </h1>
    </div>
  );
}

export function RealtimeSchedule() {
  const frame = useCurrentFrame();
  const listReveal = interpolate(
    frame,
    [112, 112 + MOTION.primaryReveal],
    [0, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const sceneOpacity = interpolate(
    frame,
    [448, 448 + MOTION.sceneExit],
    [1, 0],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );
  const partnerMarksOpacity = interpolate(
    frame,
    [112, 112 + MOTION.secondaryReveal],
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
        <ParticleDonut mode="schedule" />
        <BrandTexture />
        <PartnerMarks opacity={partnerMarksOpacity} />
        <AbsoluteFill
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ transform: "translateY(104px)", width: 900 }}>
            <ScheduleHeading />
            <div
              style={{
                marginTop: 88,
                opacity: listReveal,
                transform: `translateY(${(1 - listReveal) * 28}px)`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {timeline.map((event, index) => (
                  <TimelineEvent
                    event={event}
                    index={index}
                    key={event.sortKey}
                  />
                ))}
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <RegistrationEndCard startFrame={478} />
    </AbsoluteFill>
  );
}
