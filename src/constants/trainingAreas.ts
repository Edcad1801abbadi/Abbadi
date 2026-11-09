export const TRAINING_AREAS = [
  "Tower 2",
  "Tower 3",
] as const;

export type TrainingArea = (typeof TRAINING_AREAS)[number];
