import { memo, type CSSProperties } from "react";

import { cn } from "~/lib/utils";
import {
  MASCOT_FRAME_HEIGHT,
  MASCOT_FRAME_WIDTH,
  MASCOT_PALETTE,
  mascotFrameRuns,
  resolveMascotAnimation,
  type MascotAnimation,
  type MascotCharacter,
  type MascotRun,
  type MascotState,
} from "./mascotAnimations";
import { useMascotAnimationChoices } from "./mascotPreferences";

const runsByAnimation = new WeakMap<MascotAnimation, ReadonlyArray<MascotRun>>();

function spriteRuns(animation: MascotAnimation): ReadonlyArray<MascotRun> {
  let runs = runsByAnimation.get(animation);
  if (!runs) {
    runs = animation.frames.flatMap((frame, index) => mascotFrameRuns(frame, index));
    runsByAnimation.set(animation, runs);
  }
  return runs;
}

/**
 * The pixel mascot for a state, using the animation the user picked for it.
 * Changing state remounts the sprite, so each state's animation starts over.
 */
export const Mascot = memo(function Mascot(props: {
  readonly state: MascotState;
  /** Whose mascot to draw; Claude's when absent. */
  readonly character?: MascotCharacter | undefined;
  /** Dims the mascot for failed or stopped work. */
  readonly muted?: boolean;
  readonly className?: string;
}) {
  const character = props.character ?? "claude";
  const [choices] = useMascotAnimationChoices(character);
  const animation = resolveMascotAnimation(props.state, choices[props.state], character);
  return (
    <MascotSprite
      key={`${props.state}:${animation.id}`}
      animation={animation}
      muted={props.muted}
      className={props.className}
    />
  );
});

/**
 * Renders every frame side by side in one SVG and steps a translate across
 * them, so playback is compositor-only and moves in whole frames. Reduced
 * motion shows a single frame: the last for one-shots, the first for loops.
 */
export function MascotSprite(props: {
  readonly animation: MascotAnimation;
  readonly muted?: boolean | undefined;
  readonly className?: string | undefined;
}) {
  const { animation } = props;
  const frameCount = animation.frames.length;
  const animated = frameCount > 1;
  const style = {
    width: `${frameCount * 100}%`,
    "--mascot-end": `${(-(frameCount - 1) / frameCount) * 100}%`,
    "--mascot-steps": frameCount,
    "--mascot-duration": `${frameCount / animation.fps}s`,
    "--mascot-iterations": animation.loop ? "infinite" : 1,
  } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-3.5 flex-none overflow-hidden",
        props.muted && "opacity-50 grayscale",
        props.className,
      )}
      style={{ aspectRatio: `${MASCOT_FRAME_WIDTH} / ${MASCOT_FRAME_HEIGHT}` }}
    >
      <svg
        viewBox={`0 0 ${MASCOT_FRAME_WIDTH * frameCount} ${MASCOT_FRAME_HEIGHT}`}
        className={cn(
          "block h-full",
          animated && "motion-safe:animate-mascot-sprite",
          animated && !animation.loop && "motion-reduce:[translate:var(--mascot-end)_0]",
        )}
        style={style}
        shapeRendering="crispEdges"
      >
        {spriteRuns(animation).map((run) => (
          <rect
            key={`${run.x}:${run.y}`}
            x={run.x}
            y={run.y}
            width={run.width}
            height={1}
            className={MASCOT_PALETTE[run.color]}
          />
        ))}
      </svg>
    </span>
  );
}
