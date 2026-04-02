export type BuiltinLoop = {
  id: string;
  label: string;
  url: string;
  contentType: string;
};

export const BUILTIN_LOOPS: BuiltinLoop[] = [
  {
    id: "campfire",
    label: "Campfire",
    url: "https://www.soundjay.com/nature/sounds/fire-crackling-01.mp3",
    contentType: "audio/mpeg"
  }
];

const LOOP_MAP = new Map(BUILTIN_LOOPS.map((loop) => [loop.id, loop] as const));

export function getBuiltinLoop(id: string) {
  return LOOP_MAP.get(id) ?? null;
}

export function isBuiltinLoopKey(key: string) {
  return key.startsWith("builtin:") && LOOP_MAP.has(key.slice("builtin:".length));
}
