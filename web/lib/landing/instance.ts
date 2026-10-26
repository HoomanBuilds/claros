import type { World } from "./world";

export const shared: { world?: World; failed?: boolean; footer?: boolean } = {};

const listeners = new Set<() => void>();

export const announce = () => listeners.forEach((listener) => listener());

export const listen = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
