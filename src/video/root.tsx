import { Composition } from "remotion";
import { EventPoster, POSTER_DURATION_IN_FRAMES } from "./event-poster";
import * as schedule from "./realtime-schedule";

export function VideoRoot() {
  return (
    <>
      <Composition
        id="InstagramSchedule"
        component={schedule.RealtimeSchedule}
        durationInFrames={schedule.SCHEDULE_DURATION_IN_FRAMES}
        fps={schedule.VIDEO_FPS}
        width={1080}
        height={1350}
      />
      <Composition
        id="InstagramEventPoster"
        component={EventPoster}
        durationInFrames={POSTER_DURATION_IN_FRAMES}
        fps={schedule.VIDEO_FPS}
        width={1080}
        height={1350}
      />
    </>
  );
}
