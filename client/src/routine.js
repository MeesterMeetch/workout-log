// Shared lift ids across both weeks so history follows the lift, not the week.
export const WEEKS = {
  A: [
    {
      id: "a1",
      label: "Legs and glutes",
      kind: "legs",
      exercises: [
        { id: "goblet-squat", name: "Goblet squat" },
        { id: "romanian-deadlift", name: "Romanian deadlift" },
      ],
    },
    {
      id: "a2",
      label: "Upper push",
      kind: "push",
      exercises: [
        { id: "arnold-press", name: "Arnold press", focus: true },
        { id: "floor-press", name: "Dumbbell floor press" },
      ],
    },
    {
      id: "a3",
      label: "Legs and glutes",
      kind: "legs",
      exercises: [
        { id: "bulgarian-split-squat", name: "Bulgarian split squat" },
        { id: "hip-thrust", name: "Hip thrust" },
      ],
    },
    {
      id: "a4",
      label: "Upper pull",
      kind: "pull",
      exercises: [
        { id: "dumbbell-row", name: "Dumbbell row" },
        { id: "bicep-curl", name: "Bicep curl" },
      ],
    },
  ],
  B: [
    {
      id: "b1",
      label: "Legs and glutes",
      kind: "legs",
      exercises: [
        { id: "reverse-lunge", name: "Dumbbell reverse lunge" },
        { id: "single-leg-deadlift", name: "Single leg deadlift" },
      ],
    },
    {
      id: "b2",
      label: "Upper push",
      kind: "push",
      exercises: [
        { id: "arnold-press", name: "Arnold press", focus: true },
        { id: "incline-press", name: "Dumbbell incline press" },
      ],
    },
    {
      id: "b3",
      label: "Legs and glutes",
      kind: "legs",
      exercises: [
        { id: "step-up", name: "Dumbbell step up" },
        { id: "hip-thrust", name: "Hip thrust" },
      ],
    },
    {
      id: "b4",
      label: "Upper pull",
      kind: "pull",
      exercises: [
        { id: "renegade-row", name: "Renegade row" },
        { id: "hammer-curl", name: "Hammer curl" },
      ],
    },
  ],
};

export const KIND_LABEL = {
  legs: "Legs",
  push: "Push",
  pull: "Pull",
};
