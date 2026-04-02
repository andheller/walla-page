export type Role = "display" | "producer";

export type SceneRecord = {
  id: string;
  title: string;
  markup: string;
  startAt: number;
  endAt: number;
  audioAssetKey: string | null;
  status: "scheduled" | "played" | "cancelled";
  createdAt: number;
};

export type LoopState = {
  assetKey: string | null;
  volume: number;
  until: number | null;
};

export type RoomSnapshot = {
  roomId: string;
  now: number;
  displayWsLimit: number | null;
  currentScene: SceneRecord | null;
  upcomingScenes: SceneRecord[];
  sockets: {
    display: number;
    producer: number;
  };
  loopAudio: LoopState;
  idleSince: number | null;
  cleanupAt: number | null;
};

export type PairResponse = {
  roomId: string;
  role: Role;
  token: string;
  link?: string;
};

export type ScheduleInput = {
  title: string;
  markup: string;
  startAt: number;
  durationMs: number;
  audioAssetKey?: string | null;
};

export type LoopInput = {
  assetKey?: string | null;
  volume?: number;
  until?: number | null;
  stop?: boolean;
};

export type KickResponse = {
  ok: true;
  clearedActiveScene: boolean;
  kickedDisplays: number;
};

export type SceneTemplateInput = {
  title: string;
  headline: string;
  body: string;
  accent: string;
  kicker?: string;
};

export type SceneTemplateName = "focus" | "aurora" | "broadcast" | "poster" | "campfire" | "terminal" | "aesthetic" | "monitoring" | "dashboard" | "lofi";

export type ScenePreset = {
  id: string;
  label: string;
  title: string;
  template: SceneTemplateName;
  headline: string;
  body: string;
  accent: string;
  kicker: string;
  durationMs: number;
  publicDescription: string;
};

export type SceneEnvelope =
  | { type: "snapshot"; snapshot: RoomSnapshot }
  | { type: "scene_changed"; scene: SceneRecord | null }
  | { type: "room_meta"; snapshot: RoomSnapshot }
  | { type: "pong"; now: number }
  | { type: "error"; message: string };

export type ElevenTtsInput = {
  text: string;
  voiceId?: string;
  modelId?: string;
  filename?: string;
};
