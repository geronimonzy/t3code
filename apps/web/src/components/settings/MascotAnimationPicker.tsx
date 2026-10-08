import { useState } from "react";

import { MascotSprite } from "../../mascot/Mascot";
import {
  MASCOT_STATES,
  MASCOT_THEMES,
  matchingMascotTheme,
  mascotAnimationsForState,
  resolveMascotAnimation,
  type MascotState,
} from "../../mascot/mascotAnimations";
import { useMascotAnimationChoices } from "../../mascot/mascotPreferences";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

const STATE_LABEL = {
  idle: "Idle",
  input: "Input",
  working: "Working",
  done: "Done",
} as const satisfies Record<MascotState, string>;

const CUSTOM_THEME = "custom";

/**
 * A theme preset that sets every state at once, then one animation choice per
 * state, each with a preview that replays on click. Mixing states reads as Custom.
 */
export function MascotAnimationPicker() {
  const [choices, setChoices] = useMascotAnimationChoices();
  const theme = matchingMascotTheme(choices);
  return (
    <div className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:w-auto">
      <span className="text-muted-foreground text-xs">Theme</span>
      <span aria-hidden="true" />
      <Select
        value={theme?.id ?? CUSTOM_THEME}
        onValueChange={(value) => {
          const picked = MASCOT_THEMES.find((candidate) => candidate.id === value);
          if (picked) setChoices({ ...picked.animations });
        }}
      >
        <SelectTrigger size="sm" className="w-full min-w-0" aria-label="Mascot theme">
          <SelectValue>{theme?.label ?? "Custom"}</SelectValue>
        </SelectTrigger>
        <SelectPopup align="end" alignItemWithTrigger={false}>
          {MASCOT_THEMES.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {MASCOT_STATES.map((state) => {
        const animation = resolveMascotAnimation(state, choices[state]);
        return (
          <MascotAnimationChoice
            key={state}
            state={state}
            animationId={animation.id}
            onChange={(animationId) => setChoices({ ...choices, [state]: animationId })}
          />
        );
      })}
    </div>
  );
}

function MascotAnimationChoice(props: {
  readonly state: MascotState;
  readonly animationId: string;
  readonly onChange: (animationId: string) => void;
}) {
  const [replay, setReplay] = useState(0);
  const animation = resolveMascotAnimation(props.state, props.animationId);
  const label = STATE_LABEL[props.state];
  return (
    <>
      <span className="text-muted-foreground text-xs">{label}</span>
      <button
        type="button"
        aria-label={`Replay ${label.toLowerCase()} animation`}
        className="flex cursor-pointer items-center justify-center rounded-sm p-0.5 focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => setReplay((count) => count + 1)}
      >
        <MascotSprite key={`${animation.id}:${replay}`} animation={animation} className="h-5" />
      </button>
      <Select
        value={animation.id}
        onValueChange={(value) => {
          if (typeof value === "string") props.onChange(value);
        }}
      >
        <SelectTrigger size="sm" className="w-full min-w-0" aria-label={`${label} animation`}>
          <SelectValue>{animation.label}</SelectValue>
        </SelectTrigger>
        <SelectPopup align="end" alignItemWithTrigger={false}>
          {mascotAnimationsForState(props.state).map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </>
  );
}
