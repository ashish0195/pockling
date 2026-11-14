// The renderer: a WebGL 2 sprite batcher with a 2D transform stack, deformable meshes, and a small
// shader that draws eyes and mouths as smooth shapes, so a face stays crisp at any size and can morph
// between any two expressions. Textures are premultiplied; every sprite can be additive without a
// state change. All coordinates are CSS pixels, y down.

const SPRITE_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
layout(location=2) in vec4 a_color;
layout(location=3) in float a_add;
uniform vec2 u_res;
out vec2 v_uv;
out vec4 v_color;
out float v_add;
void main() {
  vec2 p = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
  v_add = a_add;
}`;

const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
in vec4 v_color;
in float v_add;
out vec4 o;
void main() {
  vec4 c = texture(u_tex, v_uv) * v_color;
  c.a *= 1.0 - v_add;
  o = c;
}`;

const FACE_VS = `#version 300 es
layout(location=0) in vec2 a_pos;
layout(location=1) in vec2 a_uv;
uniform vec2 u_res;
out vec2 v_p;
void main() {
  vec2 p = a_pos / u_res * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  v_p = a_uv;
}`;

// Eyes: a big glossy oval between an upper and a lower lid. The lids can meet on a curved line, so one
// shape covers wide open, blinking, happy arcs and sleepy arcs. Hearts, stars, spirals and crosses
// fade in over it for the special reactions.
const EYE_FS = `#version 300 es
precision highp float;
in vec2 v_p;
uniform vec4 u_a;      // open, low (lower lid up), arc (+ happy, - sleepy), tilt (+ sad, - cross)
uniform vec4 u_b;      // look x, look y, pupil (-1..1), sparkle (0..1)
uniform vec4 u_modes;  // heart, star, swirl, cross
uniform vec3 u_iris;
uniform vec3 u_ink;
uniform vec4 u_tint;   // scene light rgb, alpha
uniform float u_px;
uniform float u_time;
uniform float u_side;  // +1 or -1: which way is outward, for the lid tilt
out vec4 o;

float aa(float d) { return clamp(0.5 - d / (u_px * 1.5), 0.0, 1.0); }
float disc(vec2 p, vec2 c, float r) { return aa(length(p - c) - r); }

float heart(vec2 p) {
  p.y -= 0.12;
  p *= 1.18;
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - 0.3536;
  vec2 a = p - vec2(0.0, 1.0);
  vec2 b = p - 0.5 * max(p.x + p.y, 0.0);
  return sqrt(min(dot(a, a), dot(b, b))) * sign(p.x - p.y);
}

float star(vec2 p, float r) {
  float a = atan(p.x, p.y);
  float seg = 6.2831853 / 5.0;
  a = mod(a + seg * 0.5, seg) - seg * 0.5;
  vec2 q = length(p) * vec2(cos(a), abs(sin(a)));
  vec2 b = vec2(r * 0.42, r * 0.42 * 0.72);
  vec2 e = vec2(r, 0.0) - b;
  vec2 w = q - b;
  float t = clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
  vec2 d = w - e * t;
  float s = sign(e.x * w.y - e.y * w.x);
  return length(d) * (s > 0.0 ? 1.0 : -1.0) - 0.04;
}

float capsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }

void main() {
  vec2 p = v_p;
  float open = u_a.x, low = u_a.y, arc = u_a.z, tilt = u_a.w;
  vec2 look = u_b.xy;

  float closeLine = 0.02 + 0.2 * max(arc, 0.0) - 0.12 * min(arc, 0.0) - arc * 0.62 * p.x * p.x;
  float upper = mix(closeLine, 1.18, smoothstep(0.0, 1.0, open)) + tilt * 0.34 * p.x * u_side * clamp(open * 1.6, 0.0, 1.0)
              - tilt * 0.12 * clamp(open * 1.6, 0.0, 1.0);
  float lower = mix(closeLine, -1.18, smoothstep(0.0, 0.5, open) * (1.0 - low));

  float ball = (length(p / vec2(0.86, 0.96)) - 1.0) * 0.86;
  float region = max(ball, max(p.y - upper, lower - p.y));

  // The glossy eye itself.
  vec3 ink = u_ink;
  vec2 q = p - look * vec2(0.13, 0.11);
  float fall = clamp((-q.y + 0.1) / 0.95, 0.0, 1.0);
  vec3 col = mix(ink, u_iris, fall * fall * 0.95);
  float pupilR = 0.5 + u_b.z * 0.14;
  col = mix(col, ink * 0.55, aa(length(q - vec2(0.0, 0.05)) - pupilR) * 0.92);
  float crescent = smoothstep(0.42, 0.78, length(q * vec2(1.0, 1.08) + vec2(0.0, -0.02))) * smoothstep(0.1, -0.55, q.y);
  col += (u_iris * 0.55 + 0.12) * crescent * 0.75;
  col *= mix(0.62, 1.0, smoothstep(upper - 0.02, upper - 0.42, p.y));

  // Highlights slide a little with the look, like light on a wet marble.
  vec2 h = look * 0.085;
  float big = disc(p, vec2(-0.3, 0.36) + h, 0.28 + u_b.w * 0.05);
  float small = disc(p, vec2(0.33, -0.26) + h * 0.6, 0.13 + u_b.w * 0.03);
  float tiny = disc(p, vec2(-0.1, -0.46) + h * 0.5, 0.06 + u_b.w * 0.02);
  float extra = disc(p, vec2(0.38, 0.28) + h, 0.085) * u_b.w;
  float extra2 = disc(p, vec2(-0.46, -0.1) + h, 0.055) * u_b.w;
  float shimmer = 0.9 + 0.1 * sin(u_time * 7.0);
  col = mix(col, vec3(1.0), clamp(big * 0.98 + small * 0.92 + tiny * 0.75 + (extra + extra2) * shimmer, 0.0, 1.0));

  float inside = aa(region);
  float rim = aa(abs(region) - 0.035);
  vec4 eye = vec4(col * inside, inside);
  eye = over(vec4(ink * rim * 0.9, rim * 0.9), eye);

  // Upper lash line, heavier than the rest, and the closed line when the lids meet.
  float lidEdge = abs(p.y - upper);
  float within = aa(ball - 0.02);
  float lash = aa(lidEdge - 0.055) * within * step(lower, p.y) * step(upper, 1.15);
  eye = over(vec4(ink * lash, lash), eye);

  float gap = (mix(closeLine, 1.18, smoothstep(0.0, 1.0, open))) - mix(closeLine, -1.18, smoothstep(0.0, 0.5, open) * (1.0 - low));
  float shut = 1.0 - smoothstep(0.03, 0.24, gap);
  if (shut > 0.0) {
    float taper = clamp(1.0 - pow(abs(p.x) / 0.8, 2.6), 0.0, 1.0);
    float line = aa(abs(p.y - closeLine) - 0.09 * taper - 0.012) * step(abs(p.x), 0.82);
    eye = over(vec4(ink * line * shut, line * shut), eye * (1.0 - shut * 0.0));
  }

  float weight = clamp(u_modes.x + u_modes.y + u_modes.z + u_modes.w, 0.0, 1.0);
  vec4 result = eye * (1.0 - weight);

  if (u_modes.x > 0.0) {   // heart
    float beat = 1.0 + 0.06 * sin(u_time * 9.0);
    float d = heart(p * 1.22 / beat);
    vec3 c = mix(vec3(1.0, 0.27, 0.46), vec3(1.0, 0.6, 0.72), clamp(p.y * 0.6 + 0.5, 0.0, 1.0));
    float a = aa(d);
    float rimH = aa(abs(d) - 0.03);
    c = mix(c, vec3(0.62, 0.08, 0.26), rimH * 0.8);
    c = mix(c, vec3(1.0), disc(p, vec2(-0.32, 0.3), 0.15) * 0.95);
    result = over(vec4(c * a, a) * u_modes.x, result);
  }
  if (u_modes.y > 0.0) {   // star
    float d = star(p, 0.86 * (1.0 + 0.05 * sin(u_time * 8.0)));
    float a = aa(d);
    vec3 c = mix(vec3(1.0, 0.72, 0.16), vec3(1.0, 0.92, 0.5), clamp(p.y * 0.7 + 0.5, 0.0, 1.0));
    c = mix(c, vec3(0.75, 0.42, 0.05), aa(abs(d) - 0.03) * 0.8);
    c = mix(c, vec3(1.0), disc(p, vec2(-0.14, 0.2), 0.12) * 0.9);
    result = over(vec4(c * a, a) * u_modes.y, result);
  }
  if (u_modes.z > 0.0) {   // dizzy spiral
    float r = length(p);
    float a = atan(p.y, p.x) + u_time * 7.0;
    float s = abs(sin(a * 0.5 + r * 9.0));
    float line = aa(s - 0.42 + (u_px * 2.0)) * aa(r - 0.82);
    result = over(vec4(ink * line, line) * u_modes.z, result);
  }
  if (u_modes.w > 0.0) {   // squeezed shut, ><
    vec2 m = vec2(p.x * u_side, p.y);
    float d = min(capsule(m, vec2(0.55, 0.42), vec2(-0.5, -0.02), 0.1), capsule(m, vec2(-0.5, -0.02), vec2(0.55, -0.46), 0.1));
    float a = aa(d);
    result = over(vec4(ink * a, a) * u_modes.w, result);
  }

  o = vec4(result.rgb * u_tint.rgb, result.a) * u_tint.a;
}`;

// Mouths: one or two curves that morph between a small smile, a cat's w, an open laugh, an o and a
// wobble. The whole thing is a band between two curves, so talking is just moving them apart.
const MOUTH_FS = `#version 300 es
precision highp float;
in vec2 v_p;
uniform vec4 u_a;      // half width, open, curve (+ smile, - frown), cat
uniform vec4 u_b;      // round, wavy, tongue, fang
uniform vec3 u_ink;
uniform vec4 u_tint;
uniform float u_px;
uniform float u_time;
out vec4 o;

float aa(float d) { return clamp(0.5 - d / (u_px * 1.5), 0.0, 1.0); }
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }

void main() {
  vec2 p = v_p;
  float w = max(u_a.x, 0.04), open = u_a.y, curve = u_a.z, cat = u_a.w;
  float round_ = u_b.x, wavy = u_b.y, tongue = u_b.z, fang = u_b.w;
  float n = clamp(abs(p.x) / w, 0.0, 1.0);

  float smile = curve * 0.3 * (n * n - 0.38);
  float dbl = n * 2.0 - 1.0;
  float dip = -(1.0 - dbl * dbl) * 0.17 * min(1.0, w * 2.2);
  float mid = mix(smile, dip + 0.04, cat) + wavy * 0.05 * sin(p.x * 22.0 + u_time * 8.0);

  float dome = sqrt(max(1.0 - n * n, 0.0));
  float top = mid + open * mix(0.06 * (1.0 - n), 0.62 * dome, round_);
  float bottom = mid - open * mix(0.82 * pow(max(1.0 - n * n, 0.0), 0.72), 0.62 * dome, round_);

  float slope = 1.0;
  float band = max(p.y - top, bottom - p.y) * slope;
  band = max(band, abs(p.x) - w);
  float inside = aa(band);

  vec3 dark = vec3(0.42, 0.11, 0.2);
  vec3 col = mix(dark * 0.7, dark, clamp((p.y - bottom) / max(top - bottom, 0.01), 0.0, 1.0));
  float tongueD = length((p - vec2(0.0, bottom + (top - bottom) * 0.1)) / vec2(w * 0.72, max(top - bottom, 0.02) * 0.62)) - 1.0;
  float t = aa(tongueD * min(w, 0.3)) * tongue;
  vec3 tc = mix(vec3(1.0, 0.45, 0.55), vec3(1.0, 0.62, 0.68), clamp((p.y - bottom) * 3.0, 0.0, 1.0));
  col = mix(col, tc, t);
  vec4 m = vec4(col * inside, inside);

  // The line around it, with round ends.
  float ends = length(vec2(max(abs(p.x) - w, 0.0), p.y - mid)) - 0.03;
  float topLine = abs(p.y - top);
  float botLine = abs(p.y - bottom);
  float within = step(abs(p.x), w);
  float line = aa(min(topLine, botLine) - 0.05) * within;
  line = max(line, aa(ends - 0.02));
  m = over(vec4(u_ink * line, line), m);

  if (fang > 0.0 && open > 0.02) {
    float fx = abs(p.x) - w * 0.46;
    float fy = top - p.y;
    float f = aa(max(abs(fx) - (0.05 - fy * 0.34), max(-fy, fy - 0.15))) * fang * within;
    m = over(vec4(vec3(1.0) * f, f), m);
  }

  o = vec4(m.rgb * u_tint.rgb, m.a) * u_tint.a;
}`;

function compile(gl, vs, fs) {
  const make = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const uniforms = {};
  const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u: uniforms };
}

const FLOATS = 9;
const MAX_VERTS = 32000;

const WHITE = [1, 1, 1, 1];

export class Renderer {
  constructor(canvas, { onRestored } = {}) {
    this.canvas = canvas;
    this.onRestored = onRestored;
    this.time = 0;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.matrix = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.init();
      this.lost = false;
      this.onRestored?.();
    });
    this.init();
  }

  init() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' });
    if (!gl) throw new Error('WebGL 2 is not available');
    this.gl = gl;
    this.sprite_ = compile(gl, SPRITE_VS, SPRITE_FS);
    this.eye_ = compile(gl, FACE_VS, EYE_FS);
    this.mouth_ = compile(gl, FACE_VS, MOUTH_FS);
    this.verts = new Float32Array(MAX_VERTS * FLOATS);
    this.indices = new Uint16Array(MAX_VERTS * 3);
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices.byteLength, gl.DYNAMIC_DRAW);
    const stride = FLOATS * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 32);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.nv = 0;
    this.ni = 0;
    this.current = null;
    this.program = null;
    this.white = this.texture(whiteCanvas(), { mipmap: false });
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  texture(source, { mipmap = true, repeat = false, w, h } = {}) {
    const gl = this.gl;
    // A texture baked mid-frame is bound below: draw what's waiting first, with the texture it was meant for.
    this.flush();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat === 'x' ? gl.CLAMP_TO_EDGE : wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D);
    this.current = null;
    return { tex, w: w ?? source.width, h: h ?? source.height };
  }

  free(t) {
    if (t?.tex) this.gl.deleteTexture(t.tex);
  }

  begin(r = 0, g = 0, b = 0) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.matrix = [1, 0, 0, 1, 0, 0];
    this.stack.length = 0;
    this.useSprites();
  }

  end() {
    this.flush();
  }

  useSprites() {
    const gl = this.gl;
    if (this.program === 'sprite') return;
    this.flush();
    gl.useProgram(this.sprite_.p);
    gl.uniform2f(this.sprite_.u.u_res, this.width, this.height);
    gl.uniform1i(this.sprite_.u.u_tex, 0);
    this.program = 'sprite';
    this.current = null;
  }

  flush() {
    if (!this.ni) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.verts, 0, this.nv * FLOATS);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, this.indices, 0, this.ni);
    gl.drawElements(gl.TRIANGLES, this.ni, gl.UNSIGNED_SHORT, 0);
    this.nv = 0;
    this.ni = 0;
  }

  bind(t) {
    if (this.current === t.tex) return;
    this.flush();
    this.gl.bindTexture(this.gl.TEXTURE_2D, t.tex);
    this.current = t.tex;
  }

  // ── Transform stack ──

  save() {
    this.stack.push(this.matrix.slice());
  }

  restore() {
    this.matrix = this.stack.pop();
  }

  translate(x, y) {
    const m = this.matrix;
    m[4] += m[0] * x + m[2] * y;
    m[5] += m[1] * x + m[3] * y;
  }

  rotate(a) {
    const m = this.matrix;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const [a0, b0, c0, d0] = m;
    m[0] = a0 * c + c0 * s;
    m[1] = b0 * c + d0 * s;
    m[2] = -a0 * s + c0 * c;
    m[3] = -b0 * s + d0 * c;
  }

  scale(x, y = x) {
    const m = this.matrix;
    m[0] *= x;
    m[1] *= x;
    m[2] *= y;
    m[3] *= y;
  }

  /** A point in the current transform, on screen. */
  toScreen(x, y) {
    const m = this.matrix;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  // ── Drawing ──

  vertex(x, y, u, v, r, g, b, a, add) {
    const m = this.matrix;
    const f = this.verts;
    let i = this.nv * FLOATS;
    f[i++] = m[0] * x + m[2] * y + m[4];
    f[i++] = m[1] * x + m[3] * y + m[5];
    f[i++] = u;
    f[i++] = v;
    f[i++] = r * a;
    f[i++] = g * a;
    f[i++] = b * a;
    f[i++] = a;
    f[i] = add;
    return this.nv++;
  }

  /**
   * A sprite. x, y is where the anchor lands; w, h default to the texture's size; ax, ay is the anchor
   * within it (0.5, 0.5 is the centre).
   */
  sprite(t, x, y, { w = t.w, h = t.h, ax = 0.5, ay = 0.5, rot = 0, flip = false, tint = WHITE, alpha = 1, add = 0, u0 = 0, v0 = 0, u1 = 1, v1 = 1 } = {}) {
    this.useSprites();
    this.bind(t);
    if (this.nv + 4 >= MAX_VERTS) this.flush();
    const c = rot ? Math.cos(rot) : 1;
    const s = rot ? Math.sin(rot) : 0;
    const left = -w * ax;
    const right = w * (1 - ax);
    const top = -h * ay;
    const bottom = h * (1 - ay);
    const [r, g, b] = tint;
    const a = (tint[3] ?? 1) * alpha;
    const uL = flip ? u1 : u0;
    const uR = flip ? u0 : u1;
    const p = (px, py) => [x + px * c - py * s, y + px * s + py * c];
    const [ax0, ay0] = p(left, top);
    const [ax1, ay1] = p(right, top);
    const [ax2, ay2] = p(right, bottom);
    const [ax3, ay3] = p(left, bottom);
    const i0 = this.vertex(ax0, ay0, uL, v0, r, g, b, a, add);
    const i1 = this.vertex(ax1, ay1, uR, v0, r, g, b, a, add);
    const i2 = this.vertex(ax2, ay2, uR, v1, r, g, b, a, add);
    const i3 = this.vertex(ax3, ay3, uL, v1, r, g, b, a, add);
    const ix = this.indices;
    let n = this.ni;
    ix[n++] = i0;
    ix[n++] = i1;
    ix[n++] = i2;
    ix[n++] = i0;
    ix[n++] = i2;
    ix[n++] = i3;
    this.ni = n;
  }

  rect(x, y, w, h, color, alpha = 1) {
    this.sprite(this.white, x, y, { w, h, ax: 0, ay: 0, tint: color, alpha });
  }

  /** A grid mesh over a texture. `at(u, v, out)` writes the position of each grid point into out. */
  grid(t, cols, rows, at, { tint = WHITE, alpha = 1, add = 0 } = {}) {
    this.useSprites();
    this.bind(t);
    const count = (cols + 1) * (rows + 1);
    if (this.nv + count >= MAX_VERTS || this.ni + cols * rows * 6 >= this.indices.length) this.flush();
    const base = this.nv;
    const out = [0, 0];
    const [r, g, b] = tint;
    const a = (tint[3] ?? 1) * alpha;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        at(u, v, out);
        this.vertex(out[0], out[1], u, v, r, g, b, a, add);
      }
    }
    const ix = this.indices;
    let n = this.ni;
    const row = cols + 1;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const q = base + j * row + i;
        ix[n++] = q;
        ix[n++] = q + 1;
        ix[n++] = q + row + 1;
        ix[n++] = q;
        ix[n++] = q + row + 1;
        ix[n++] = q + row;
      }
    }
    this.ni = n;
  }

  /**
   * A strip of texture bent along a line of points, for tails, floppy ears and ropes. The texture's v
   * runs along the strip, from root (v = 0) to tip (v = 1). points is [x, y, halfWidth, ...].
   */
  ribbon(t, points, { tint = WHITE, alpha = 1, add = 0 } = {}) {
    this.useSprites();
    this.bind(t);
    const n = points.length / 3;
    if (this.nv + n * 2 >= MAX_VERTS || this.ni + n * 6 >= this.indices.length) this.flush();
    const [r, g, b] = tint;
    const a = (tint[3] ?? 1) * alpha;
    const base = this.nv;
    for (let i = 0; i < n; i++) {
      const x = points[i * 3];
      const y = points[i * 3 + 1];
      const hw = points[i * 3 + 2];
      const pi = Math.max(i - 1, 0);
      const ni = Math.min(i + 1, n - 1);
      let dx = points[ni * 3] - points[pi * 3];
      let dy = points[ni * 3 + 1] - points[pi * 3 + 1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const v = i / (n - 1);
      this.vertex(x - dy * hw, y + dx * hw, 1, v, r, g, b, a, add);
      this.vertex(x + dy * hw, y - dx * hw, 0, v, r, g, b, a, add);
    }
    const ix = this.indices;
    let c = this.ni;
    for (let i = 0; i < n - 1; i++) {
      const q = base + i * 2;
      ix[c++] = q;
      ix[c++] = q + 1;
      ix[c++] = q + 3;
      ix[c++] = q;
      ix[c++] = q + 3;
      ix[c++] = q + 2;
    }
    this.ni = c;
  }

  /** How many CSS pixels one unit of the current transform covers. */
  get unit() {
    return Math.hypot(this.matrix[0], this.matrix[1]);
  }

  face(prog, x, y, size, setup) {
    const gl = this.gl;
    this.flush();
    this.program = 'face';
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.u_res, this.width, this.height);
    gl.uniform1f(prog.u.u_px, 1 / Math.max(size * this.unit * this.dpr, 1));
    gl.uniform1f(prog.u.u_time, this.time);
    setup(prog.u);
    const m = this.matrix;
    const f = this.verts;
    const put = (i, px, py, u, v) => {
      const X = x + px * size;
      const Y = y + py * size;
      f[i * FLOATS] = m[0] * X + m[2] * Y + m[4];
      f[i * FLOATS + 1] = m[1] * X + m[3] * Y + m[5];
      f[i * FLOATS + 2] = u;
      f[i * FLOATS + 3] = v;
    };
    // Quad corners extend past the shape a little so its soft edge isn't cut off.
    const e = 1.25;
    put(0, -e, -e, -e, e);
    put(1, e, -e, e, e);
    put(2, e, e, e, -e);
    put(3, -e, e, -e, -e);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, f, 0, 4 * FLOATS);
    const ix = this.indices;
    ix[0] = 0;
    ix[1] = 1;
    ix[2] = 2;
    ix[3] = 0;
    ix[4] = 2;
    ix[5] = 3;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, ix, 0, 6);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    this.useSprites();
  }

  /**
   * An eye. e: { open, low, arc, tilt, lookX, lookY, pupil, sparkle, heart, star, swirl, cross, iris, ink }.
   * side is +1 or -1, whichever way is outward for this eye: lids mirror, highlights don't.
   */
  eye(x, y, size, e, side, light = WHITE, alpha = 1) {
    this.face(this.eye_, x, y, size, (u) => {
      const gl = this.gl;
      gl.uniform1f(u.u_side, side);
      gl.uniform4f(u.u_a, e.open, e.low, e.arc, e.tilt);
      gl.uniform4f(u.u_b, e.lookX, e.lookY, e.pupil, e.sparkle);
      gl.uniform4f(u.u_modes, e.heart, e.star, e.swirl, e.cross);
      gl.uniform3fv(u.u_iris, e.iris);
      gl.uniform3fv(u.u_ink, e.ink);
      gl.uniform4f(u.u_tint, light[0], light[1], light[2], alpha);
    });
  }

  /** A mouth. m: { w, open, curve, cat, round, wavy, tongue, fang, ink }; size is half its height in units. */
  mouth(x, y, size, m, light = WHITE, alpha = 1) {
    this.face(this.mouth_, x, y, size, (u) => {
      const gl = this.gl;
      gl.uniform4f(u.u_a, m.w, m.open, m.curve, m.cat);
      gl.uniform4f(u.u_b, m.round, m.wavy, m.tongue, m.fang);
      gl.uniform3fv(u.u_ink, m.ink);
      gl.uniform4f(u.u_tint, light[0], light[1], light[2], alpha);
    });
  }
}

function whiteCanvas() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 2;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 2, 2);
  return c;
}

/**
 * Textures baked on first use and rebuilt if the GL context is lost. define() registers how to paint a
 * key; get() returns its texture.
 */
export class Assets {
  constructor(renderer) {
    this.r = renderer;
    this.bakers = new Map();
    this.cache = new Map();
  }

  define(key, baker, options) {
    this.bakers.set(key, { baker, options });
    const had = this.cache.get(key);
    if (had) {
      this.r.free(had);
      this.cache.delete(key);
    }
  }

  has(key) {
    return this.bakers.has(key);
  }

  get(key) {
    let t = this.cache.get(key);
    if (t) return t;
    const entry = this.bakers.get(key);
    if (!entry) throw new Error(`No texture called ${key}`);
    const made = entry.baker();
    t = this.r.texture(made.canvas ?? made, { ...entry.options, w: made.w, h: made.h });
    t.source = entry.options?.keepSource ? (made.canvas ?? made) : null;
    for (const k of Object.keys(made)) {
      if (k !== 'canvas' && k !== 'w' && k !== 'h') t[k] = made[k];
    }
    this.cache.set(key, t);
    return t;
  }

  drop(prefix) {
    for (const [key, t] of this.cache) {
      if (key.startsWith(prefix)) {
        this.r.free(t);
        this.cache.delete(key);
      }
    }
  }

  /** After a lost context, every texture is gone: forget them and bake again on next use. */
  reset() {
    this.cache.clear();
  }
}
