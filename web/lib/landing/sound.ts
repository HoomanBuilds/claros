"use client";

import { Howl, Howler } from "howler";
import banks from "@/lib/landing/sfx.json";

export type SfxName = keyof typeof banks.sfx.sprite;
export type Scene = keyof typeof banks.themes;
export type CueName = keyof typeof banks.cues;

const FADE = 1500;
const VOLUME = { sfx: 0.45, chimes: 0.3, theme: 0.5, cue: 0.5 };
const CHIMES = Object.keys(banks.rollovers.sprite);

const sprite = (entries: Record<string, number[]>) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, [start, duration]]) => [
      name,
      [start, duration] as [number, number],
    ]),
  );

let sfx: Howl | undefined;
let chimes: Howl | undefined;
let chimeId: number | undefined;
const cues: Partial<Record<CueName, Howl>> = {};
let themes: Record<Scene, Howl> | undefined;
let scene: Scene = "egg";
let enabled = false;
let entered = false;
let hiddenMute = false;
const listeners = new Set<() => void>();
const timers: number[] = [];

function load() {
  sfx ??= new Howl({
    src: [banks.sfx.src],
    sprite: sprite(banks.sfx.sprite),
    volume: VOLUME.sfx,
  });
  chimes ??= new Howl({
    src: [banks.rollovers.src],
    sprite: sprite(banks.rollovers.sprite),
    volume: VOLUME.chimes,
  });
}

function createTheme(name: Scene) {
  let fadingOut = false;
  const theme = new Howl({
    src: [banks.themes[name]],
    loop: true,
    html5: true,
    volume: 0,
    onplay: () => {
      fadingOut = false;
      if (scene === name) theme.fade(0, VOLUME.theme, FADE);
    },
  });
  const watchEnd = () => {
    const duration = theme.duration();
    const time = theme.seek() as number;
    if (duration && time > duration - FADE / 1000 && !fadingOut) {
      fadingOut = true;
      if (scene === name)
        theme.fade(theme.volume() as number, 0, (duration - time) * 1000);
    }
  };
  timers.push(window.setInterval(watchEnd, 200));
  theme.play();
  return theme;
}

function startThemes() {
  if (themes) return;
  themes = { egg: createTheme("egg"), griffin: createTheme("griffin") };
}

function setEnabled(value: boolean) {
  enabled = value;
  if (value) {
    load();
    if (entered) startThemes();
  }
  Howler.mute(!value || hiddenMute);
  listeners.forEach((listener) => listener());
}
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    hiddenMute = document.hidden;
    Howler.mute(!enabled || hiddenMute);
  });
}

export const sound = {
  dispose() {
    timers.splice(0).forEach((timer) => window.clearInterval(timer));
    sfx?.unload();
    chimes?.unload();
    Object.values(cues).forEach((cue) => cue?.unload());
    Object.keys(cues).forEach((name) => delete cues[name as CueName]);
    if (themes) Object.values(themes).forEach((theme) => theme.unload());
    sfx = undefined;
    chimes = undefined;
    chimeId = undefined;
    themes = undefined;
    scene = "egg";
    entered = false;
    setEnabled(false);
  },
  toggle() {
    setEnabled(!enabled);
    if (enabled) sound.play("ClickUI");
  },
  isEnabled: () => enabled,
  play(name: SfxName) {
    if (enabled) sfx?.play(name);
  },

  chime() {
    if (enabled)
      chimeId = chimes?.play(CHIMES[Math.floor(Math.random() * CHIMES.length)]);
  },

  scrollChime() {
    if (!enabled || (chimeId !== undefined && chimes?.playing(chimeId))) return;
    sound.chime();
  },

  startMusic() {
    entered = true;
    if (enabled) startThemes();
  },

  setScene(next: Scene) {
    if (next === scene) return;
    scene = next;
    if (!themes) return;
    const [incoming, outgoing] =
      next === "egg"
        ? [themes.egg, themes.griffin]
        : [themes.griffin, themes.egg];
    outgoing.fade(outgoing.volume() as number, 0, FADE);
    incoming.fade(incoming.volume() as number, VOLUME.theme, FADE);
  },

  cue(name: CueName) {
    if (!enabled) return;
    const howl = (cues[name] ??= new Howl({
      src: [banks.cues[name]],
      volume: VOLUME.cue,
    }));
    if (howl.playing()) howl.fade(howl.volume() as number, VOLUME.cue, 1000);
    else {
      howl.volume(VOLUME.cue);
      howl.play();
    }
  },

  fadeCue(name: CueName) {
    const howl = cues[name];
    if (howl?.playing()) howl.fade(howl.volume() as number, 0, 1000);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
