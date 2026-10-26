"use client";

import type { AnimationItem } from "lottie-web";

export async function mountLottie(
  container: HTMLElement,
  name: string,
): Promise<AnimationItem> {
  const { default: lottie } = await import("lottie-web");
  return lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: `/landing/penumbra/lottie/${name}.json`,
    rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
  });
}

export function scrub(animation: AnimationItem | undefined, progress: number) {
  if (!animation || !animation.totalFrames) return;
  animation.goToAndStop(
    Math.min(
      animation.totalFrames - 1,
      Math.max(0, progress) * (animation.totalFrames - 1),
    ),
    true,
  );
}
