// Tiny stack VM (ISA.md; vm.mjs is ground truth). Node 22, stdlib only.
import { mkdirSync as d, readdirSync as r, readFileSync as f, writeFileSync as w } from 'node:fs';
import { join as j } from 'node:path';
const e = new TextEncoder;
// opcode -> [imm, pops, pushes]; null = unknown opcode
function D(o) {
  if (o < 8) return [[0, 1, 4, 0, 0, 0, 0, 0][o], [0, 0, 0, 1, 1, 2, 2, 3][o], [0, 1, 1, 0, 2, 2, 3, 3][o]];
  if (o < 0x10 || o > 0x53) return null;
  if (o < 0x23) return o === 0x1f ? null : [0, o === 0x17 || o === 0x1b ? 1 : 2, 1];
  if (o < 0x30) return null;
  if (o < 0x35) return [o === 0x34 ? 0 : 2, o === 0x31 || o === 0x32 ? 1 : 0, 0];
  if (o < 0x40) return null;
  if (o < 0x42) return [0, o === 0x40 ? 1 : 2, o === 0x40 ? 1 : 0];
  if (o < 0x50) return null;
  return [0, o === 0x52 ? 0 : 1, o === 0x52 ? 1 : 0];
}
function R(p, q) {
  const n = p.length, S = new Int32Array(256);
  let s = 0;
  const C = new Int32Array(64);
  let c = 0;
  const M = new Int32Array(256), o = new Uint8Array(65536);
  let l = 0, i = 0, t = 0, g = 0;
  const z = (x) => ({ out: o.slice(0, l), code: x });
  for (;;) {
    if (g === 1e6) return z(10);
    if (t < 0 || t >= n) return z(9);
    const y = D(p[t]);
    if (!y) return z(5);
    const [m, a, b] = y;
    if (t + m >= n) return z(9);
    g++;
    const x = t + 1 + m;
    if (s < a) return z(2);
    if (s - a + b > 256) return z(3);
    const h = p[t];
    t = x;
    switch (h) {
      case 0: return z(0);
      case 1: S[s++] = (p[x - 1] << 24) >> 24; break;
      case 2: S[s++] = p[x - 4] | (p[x - 3] << 8) | (p[x - 2] << 16) | (p[x - 1] << 24); break;
      case 3: s--; break;
      case 4: S[s] = S[s - 1]; s++; break;
      case 5: { const v = S[s - 1]; S[s - 1] = S[s - 2]; S[s - 2] = v; break; }
      case 6: S[s] = S[s - 2]; s++; break;
      case 7: { const v = S[s - 3]; S[s - 3] = S[s - 2]; S[s - 2] = S[s - 1]; S[s - 1] = v; break; }
      case 0x17: S[s - 1] = -S[s - 1] | 0; break;
      case 0x1b: S[s - 1] = ~S[s - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e: case 0x20:
      case 0x21: case 0x22: {
        const B = S[s - 1], A = S[s - 2];
        let v;
        if (h === 0x10) v = (A + B) | 0;
        else if (h === 0x11) v = (A - B) | 0;
        else if (h === 0x12) v = Math.imul(A, B);
        else if (h === 0x13) { if (!B) return z(4); v = A === -2147483648 && B === -1 ? A : (A / B) | 0; }
        else if (h === 0x14) { if (!B) return z(4); v = B === -1 ? 0 : (A % B) | 0; }
        else if (h === 0x15) { if (!B) return z(4); v = Math.floor((A >>> 0) / (B >>> 0)) | 0; }
        else if (h === 0x16) { if (!B) return z(4); v = ((A >>> 0) % (B >>> 0)) | 0; }
        else if (h === 0x18) v = A & B;
        else if (h === 0x19) v = A | B;
        else if (h === 0x1a) v = A ^ B;
        else if (h === 0x1c) v = A << (B & 31);
        else if (h === 0x1d) v = A >> (B & 31);
        else if (h === 0x1e) v = (A >>> (B & 31)) | 0;
        else if (h === 0x20) v = A === B ? 1 : 0;
        else if (h === 0x21) v = A < B ? 1 : 0;
        else v = (A >>> 0) < (B >>> 0) ? 1 : 0;
        s -= 2; S[s++] = v; break;
      }
      case 0x30: case 0x31: case 0x32: {
        const v = ((p[x - 2] | (p[x - 1] << 8)) << 16) >> 16;
        let k = true;
        if (h !== 0x30) { const u = S[--s]; k = h === 0x31 ? u === 0 : u !== 0; }
        if (k) t = x + v; break;
      }
      case 0x33:
        if (c === 64) return z(7);
        C[c++] = x; t = p[x - 2] | (p[x - 1] << 8); break;
      case 0x34:
        if (!c) return z(8);
        t = C[--c]; break;
      case 0x40: {
        const v = S[s - 1];
        if (v < 0 || v > 255) return z(6);
        S[s - 1] = M[v]; break;
      }
      case 0x41: {
        const v = S[s - 1], A = S[s - 2];
        if (v < 0 || v > 255) return z(6);
        s -= 2; M[v] = A; break;
      }
      case 0x50: {
        const b = e.encode(String(S[s - 1]));
        if (l + b.length > 65536) return z(11);
        s--; o.set(b, l); l += b.length; break;
      }
      case 0x51:
        if (l + 1 > 65536) return z(11);
        o[l++] = S[--s] & 255; break;
      case 0x52: S[s++] = i < q.length ? q[i++] : -1; break;
      case 0x53: return z(S[--s] & 255);
    }
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of r(I).sort()) {
  const v = R(new Uint8Array(f(j(I, id, 'program.bin'))), new Uint8Array(f(j(I, id, 'input.bin'))));
  d(j(O, id), { recursive: true });
  w(j(O, id, 'stdout.bin'), v.out);
  w(j(O, id, 'exit.txt'), v.code + '\n');
}
