"use client";

export type Print = {
  cell: number;

  ink: string;
  ground: string;

  tint?: string;

  tintAmount?: number;

  focus?: [number, number];

  gamma?: number;

  zoom?: number;

  invert?: boolean;
};

const images = new Map<string, Promise<HTMLImageElement>>();

export const loadImage = (src: string) => {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      }),
    );
  }
  return images.get(src)!;
};

const masks = new Map<string, HTMLCanvasElement>();

async function inked(ink: string) {
  if (masks.has(ink)) return masks.get(ink)!;
  const sprite = await loadImage("/landing/hyperlane/glyphs.png");
  const canvas = document.createElement("canvas");
  canvas.width = sprite.naturalWidth;
  canvas.height = sprite.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(sprite, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  for (let i = 0; i < pixels.data.length; i += 4) {
    const alpha = pixels.data[i];
    pixels.data[i] = r;
    pixels.data[i + 1] = g;
    pixels.data[i + 2] = b;
    pixels.data[i + 3] = alpha;
  }
  ctx.putImageData(pixels, 0, 0);
  masks.set(ink, canvas);
  return canvas;
}

function rgb(ctx: CanvasRenderingContext2D, colour: string) {
  ctx.fillStyle = colour;
  const hex = ctx.fillStyle as string;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export async function print(
  canvas: HTMLCanvasElement,
  src: string,
  options: Print,
) {
  const [image, glyphs] = await Promise.all([
    loadImage(src),
    inked(options.ink),
  ]);
  const {
    cell,
    ground,
    focus = [0.5, 0.5],
    gamma = 0.8,
    zoom = 1,
    tint,
    tintAmount = 0.5,
    invert = false,
  } = options;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const sample = document.createElement("canvas");
  sample.width = cols;
  sample.height = rows;
  const sctx = sample.getContext("2d", { willReadFrequently: true })!;
  const scale =
    Math.max(
      (cols * cell) / image.naturalWidth,
      (rows * cell) / image.naturalHeight,
    ) * zoom;
  const sw = (cols * cell) / scale;
  const sh = (rows * cell) / scale;
  const sx = (image.naturalWidth - sw) * focus[0];
  const sy = (image.naturalHeight - sh) * focus[1];
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
  const data = sctx.getImageData(0, 0, cols, rows).data;
  const lums = new Float32Array(cols * rows);
  let [low, high] = [1, 0];
  for (let c = 0; c < lums.length; c++) {
    const i = c * 4;
    const lum =
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    lums[c] = lum;
    low = Math.min(low, lum);
    high = Math.max(high, lum);
  }
  const range = Math.max(high - low, 1e-3);

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const count = Math.round(glyphs.width / glyphs.height);
  const size = glyphs.height;
  const step = cell * dpr;
  const [g, t] = [rgb(ctx, ground), tint ? rgb(ctx, tint) : undefined];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const stretched = (lums[y * cols + x] - low) / range;
      const level = Math.pow(invert ? 1 - stretched : stretched, gamma);
      if (t) {
        const k = level * tintAmount;
        ctx.fillStyle = `rgb(${g.map((v, j) => Math.round(v + (t[j] - v) * k)).join(",")})`;
        ctx.fillRect(x * step, y * step, Math.ceil(step), Math.ceil(step));
      }
      const index = Math.min(count - 1, Math.floor(level * count));
      if (index <= 0) continue;
      ctx.drawImage(
        glyphs,
        index * size,
        0,
        size,
        size,
        x * step,
        y * step,
        step,
        step,
      );
    }
  }
}
