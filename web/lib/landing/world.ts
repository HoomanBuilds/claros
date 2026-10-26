const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const PAINT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uRes;
uniform vec2 uSize;
uniform float uZoom;
uniform vec2 uPan;
out vec4 fragColor;

void main() {
  float screen = uRes.x / uRes.y;
  float image = uSize.x / uSize.y;
  vec2 fit = screen > image ? vec2(1.0, image / screen) : vec2(screen / image, 1.0);
  vec2 uv = (vUv - 0.5) * fit / uZoom + 0.5 + uPan;
  fragColor = vec4(texture(uImage, clamp(uv, 0.0, 1.0)).rgb, 1.0);
}`;

const GLYPHS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uSprite;
uniform vec2 uRes;
uniform float uCell;
uniform float uCount;
uniform float uData;
uniform vec2 uDir;
uniform vec3 uProbe;
uniform float uTime;
out vec4 fragColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
  vec2 px = vUv * uRes;
  vec2 cell = floor(px / uCell);
  vec2 centre = (cell + 0.5) * uCell / uRes;
  vec3 photo = texture(uScene, vUv).rgb;
  vec2 dir = normalize(uDir);
  float along = dot(centre - 0.5, dir) / (0.5 * (abs(dir.x) + abs(dir.y))) * 0.5 + 0.5;
  float seed = hash(cell);
  float lead = uData * 1.24 - 0.12 - along + (seed - 0.5) * 0.1;
  float data = step(0.0, lead);
  float front = data * (1.0 - smoothstep(0.0, 0.07, lead));
  float probe = 1.0 - smoothstep(uProbe.z * 0.75, uProbe.z, length((cell + 0.5) * uCell - uProbe.xy));
  data = max(data, step(0.5, probe));
  if (data < 0.5) { fragColor = vec4(photo, 1.0); return; }

  vec3 color = texture(uScene, centre).rgb;
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float index = clamp(floor(pow(lum, 0.55) * uCount * 1.15), 1.0, uCount - 1.0);
  if (front > 0.02) index = floor(hash(cell + floor(uTime * 14.0)) * uCount);
  vec2 local = fract(px / uCell);
  local.y = 1.0 - local.y;
  float glyph = texture(uSprite, vec2((index + local.x) / uCount, local.y)).r;
  float peak = max(max(color.r, color.g), color.b);
  vec3 ink = color / max(peak, 1e-3) * min(1.0, 0.35 + peak);
  ink = mix(ink, vec3(0.918, 0.345, 0.047), front);
  vec3 cellBg = mix(vec3(0.059), color, 0.2);
  fragColor = vec4(mix(cellBg, ink, smoothstep(0.1, 0.9, glyph)), 1.0);
}`;

const FROST = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uRes;
uniform float uTime;
uniform float uClarity;
uniform vec3 uLens;
uniform vec3 uWave;
uniform float uFrost;
out vec4 fragColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

void main() {
  vec2 px = vUv * uRes;
  float aspect = uRes.x / uRes.y;
  vec2 uv = vec2(vUv.x * aspect, vUv.y);
  float across = 3.0;
  vec2 id = floor(uv * across);
  for (int level = 0; level < 3; level++) {
    if (hash(id + float(level) * 17.3) > 0.55) break;
    across *= 2.0;
    id = floor(uv * across);
  }
  vec2 local = fract(uv * across);
  float seed = hash(id * 1.7 + across);
  float clearAt = seed * 0.85;
  float clear = smoothstep(clearAt, clearAt + 0.15, uClarity);
  vec2 tileCentre = (id + 0.5) / across / vec2(aspect, 1.0) * uRes;
  float lens = 1.0 - smoothstep(uLens.z * 0.7, uLens.z, length(tileCentre - uLens.xy));
  float wave = 1.0 - smoothstep(uWave.z - 140.0, uWave.z, length(tileCentre - uWave.xy));
  clear = max(clear, max(lens, wave));
  float blur = (1.0 - clear) * uFrost * (2.5 + seed * 3.5 + sin(uTime * 0.6 + seed * 6.28) * 0.6);
  vec2 drift = (1.0 - clear) * vec2(sin(uTime * 0.4 + seed * 9.0), cos(uTime * 0.35 + seed * 7.0)) * 0.004;
  vec3 col = textureLod(uImage, vUv + drift, blur).rgb;
  vec2 edge = min(local, 1.0 - local) * uRes.y / across;
  float seam = (1.0 - smoothstep(0.0, 1.5, min(edge.x * aspect, edge.y))) * (1.0 - clear);
  col = mix(col, col * 1.06 + vec3(0.05), (1.0 - clear) * uFrost * 0.6) + seam * 0.06;
  col += (hash(px + fract(uTime)) - 0.5) * 0.02;
  fragColor = vec4(col, 1.0);
}`;

type Pass = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};
type Picture = { tex: WebGLTexture; w: number; h: number };

export class World {
  clarity = 0;

  frost = 1;
  lens = { x: -999, y: -999, r: 0 };
  wave = { x: 0, y: 0, r: 0 };

  data = 0;

  direction = { x: -0.9, y: 0.35 };

  probe = { x: -999, y: -999, r: 0 };
  zoom = 1;
  pan = { x: 0, y: 0 };

  cell = 12;

  private gl: WebGL2RenderingContext;
  private paint: Pass;
  private glyphs: Pass;
  private frostPass: Pass;
  private sprite: WebGLTexture;
  private pictures = new Map<string, Picture>();
  private picture?: Picture;
  private targets: {
    fb: WebGLFramebuffer;
    tex: WebGLTexture;
    w: number;
    h: number;
  }[] = [];
  private time = 0;
  private dpr = 1;
  private count = 8;

  constructor(
    private canvas: HTMLCanvasElement,
    sprite: HTMLImageElement,
    pictures: Record<string, HTMLImageElement>,
  ) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.paint = this.compile(PAINT, [
      "uImage",
      "uRes",
      "uSize",
      "uZoom",
      "uPan",
    ]);
    this.glyphs = this.compile(GLYPHS, [
      "uScene",
      "uSprite",
      "uRes",
      "uCell",
      "uCount",
      "uData",
      "uDir",
      "uProbe",
      "uTime",
    ]);
    this.frostPass = this.compile(FROST, [
      "uImage",
      "uRes",
      "uTime",
      "uClarity",
      "uLens",
      "uWave",
      "uFrost",
    ]);
    this.sprite = this.upload(sprite, false);
    this.count = Math.round(sprite.naturalWidth / sprite.naturalHeight);
    for (const [name, image] of Object.entries(pictures)) {
      this.pictures.set(name, {
        tex: this.upload(image, true),
        w: image.naturalWidth,
        h: image.naturalHeight,
      });
    }
    this.picture = this.pictures.values().next().value;
    gl.bindVertexArray(gl.createVertexArray());
    this.resize();
  }

  show(name: string) {
    this.picture = this.pictures.get(name) ?? this.picture;
  }

  private upload(image: HTMLImageElement, flip: boolean) {
    const { gl } = this;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private compile(fragment: string, names: string[]): Pass {
    const { gl } = this;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s) || "shader");
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) || "link");
    return {
      program,
      uniforms: Object.fromEntries(
        names.map((n) => [n, gl.getUniformLocation(program, n)]),
      ),
    };
  }

  private target(w: number, h: number, mips: boolean) {
    const { gl } = this;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    return { fb, tex, w, h };
  }

  resize() {
    const { gl } = this;
    this.dpr = 1;
    const w = Math.max(2, Math.round(this.canvas.clientWidth * this.dpr));
    const h = Math.max(2, Math.round(this.canvas.clientHeight * this.dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    for (const t of this.targets) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fb);
    }
    this.targets = [this.target(w, h, false), this.target(w, h, true)];
  }

  render(delta: number) {
    const { gl, picture } = this;
    if (!picture) return;
    this.time += delta;
    const [paintTarget, glyphTarget] = this.targets;
    const height = this.canvas.clientHeight;
    const plain = this.data <= 0 && this.probe.r <= 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, plain ? glyphTarget.fb : paintTarget.fb);
    gl.viewport(0, 0, paintTarget.w, paintTarget.h);
    gl.useProgram(this.paint.program);
    const u = this.paint.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, picture.tex);
    gl.uniform1i(u.uImage, 0);
    gl.uniform2f(u.uRes, paintTarget.w, paintTarget.h);
    gl.uniform2f(u.uSize, picture.w, picture.h);
    gl.uniform1f(u.uZoom, this.zoom);
    gl.uniform2f(u.uPan, this.pan.x, this.pan.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!plain) this.sweep(paintTarget, glyphTarget, height);
    this.finish(glyphTarget, height);
  }

  private sweep(
    paintTarget: { tex: WebGLTexture },
    glyphTarget: { fb: WebGLFramebuffer; w: number; h: number },
    height: number,
  ) {
    const { gl, dpr } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, glyphTarget.fb);
    gl.viewport(0, 0, glyphTarget.w, glyphTarget.h);
    gl.useProgram(this.glyphs.program);
    const u = this.glyphs.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, paintTarget.tex);
    gl.uniform1i(u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.sprite);
    gl.uniform1i(u.uSprite, 1);
    gl.uniform2f(u.uRes, glyphTarget.w, glyphTarget.h);
    gl.uniform1f(u.uCell, this.cell * dpr);
    gl.uniform1f(u.uCount, this.count);
    gl.uniform1f(u.uData, this.data);
    gl.uniform2f(u.uDir, this.direction.x, this.direction.y);
    gl.uniform3f(
      u.uProbe,
      this.probe.x * dpr,
      (height - this.probe.y) * dpr,
      this.probe.r * dpr,
    );
    gl.uniform1f(u.uTime, this.time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private finish(glyphTarget: { tex: WebGLTexture }, height: number) {
    const { gl, dpr } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (this.frost > 0.001) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glyphTarget.tex);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.frostPass.program);
    const u = this.frostPass.uniforms;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glyphTarget.tex);
    gl.uniform1i(u.uImage, 0);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uClarity, this.frost > 0.001 ? this.clarity : 1);
    gl.uniform3f(
      u.uLens,
      this.lens.x * dpr,
      (height - this.lens.y) * dpr,
      this.lens.r * dpr,
    );
    gl.uniform3f(
      u.uWave,
      this.wave.x * dpr,
      (height - this.wave.y) * dpr,
      this.wave.r * dpr,
    );
    gl.uniform1f(u.uFrost, this.frost);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const { gl } = this;
    for (const p of [this.paint, this.glyphs, this.frostPass])
      gl.deleteProgram(p.program);
  }
}
