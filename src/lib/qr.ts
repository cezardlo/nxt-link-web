// Minimal, dependency-free QR code generator — byte mode, error-correction
// level M, versions 1–10 (fits any invite/signup URL with lots of headroom).
// Implements the relevant slice of ISO/IEC 18004: Reed–Solomon EC over
// GF(256), all 8 masks with standard penalty scoring, format + version bits.
// Written in-repo (≈250 lines) so we don't add an npm package for one admin
// screen. Rendered as SVG by src/components/QRCode.tsx.
//
// API: qrMatrix('https://…') → boolean[][] (true = dark module), or throws
// if the text is too long for version 10-M (655+ bytes — never our URLs).

interface BlockSpec { ec: number; groups: Array<[count: number, dataLen: number]> }

// EC level M block structure per version (ISO 18004 table 9).
const BLOCKS: Record<number, BlockSpec> = {
  1: { ec: 10, groups: [[1, 16]] },
  2: { ec: 16, groups: [[1, 28]] },
  3: { ec: 26, groups: [[1, 44]] },
  4: { ec: 18, groups: [[2, 32]] },
  5: { ec: 24, groups: [[2, 43]] },
  6: { ec: 16, groups: [[4, 27]] },
  7: { ec: 18, groups: [[4, 31]] },
  8: { ec: 22, groups: [[2, 38], [2, 39]] },
  9: { ec: 22, groups: [[3, 36], [2, 37]] },
  10: { ec: 26, groups: [[4, 43], [1, 44]] },
};

// Alignment-pattern center coordinates per version.
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

// ---- GF(256) arithmetic (polynomial 0x11D) --------------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x; LOG[x] = i;
    x <<= 1; if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
function gfMul(a: number, b: number): number { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

/** Reed–Solomon divisor polynomial of the given degree. */
function rsDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

/** Remainder of data ÷ divisor — the EC codewords for one block. */
function rsRemainder(data: Uint8Array, divisor: Uint8Array): Uint8Array {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

function getBit(x: number, i: number): boolean { return ((x >>> i) & 1) !== 0; }

/** Build the full codeword sequence (data + interleaved EC) for a version. */
function buildCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const spec = BLOCKS[version];
  const totalData = spec.groups.reduce((s, [n, len]) => s + n * len, 0);
  const lenBits = version <= 9 ? 8 : 16;

  // Bit stream: mode 0100 + length + data bytes.
  const bits: number[] = [];
  const push = (val: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, lenBits);
  for (const b of bytes) push(b, 8);
  // Terminator + pad to byte + pad codewords 0xEC / 0x11.
  const capacity = totalData * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const data = new Uint8Array(totalData);
  for (let i = 0; i < bits.length; i++) data[i >> 3] |= bits[i] << (7 - (i & 7));
  for (let i = bits.length / 8, pad = 0xec; i < totalData; i++, pad ^= 0xfd) data[i] = pad;

  // Split into blocks, compute EC, interleave.
  const divisor = rsDivisor(spec.ec);
  const blocks: Uint8Array[] = [];
  const ecs: Uint8Array[] = [];
  let off = 0;
  for (const [count, len] of spec.groups) {
    for (let b = 0; b < count; b++) {
      const block = data.slice(off, off + len);
      off += len;
      blocks.push(block);
      ecs.push(rsRemainder(block, divisor));
    }
  }
  const maxLen = Math.max(...blocks.map((b) => b.length));
  const out: number[] = [];
  for (let i = 0; i < maxLen; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < spec.ec; i++) for (const e of ecs) out.push(e[i]);
  return new Uint8Array(out);
}

/** Generate the module matrix for the given text (UTF-8, EC level M). */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  // Smallest version that fits.
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const totalData = BLOCKS[v].groups.reduce((s, [n, len]) => s + n * len, 0);
    const lenBits = v <= 9 ? 8 : 16;
    if (4 + lenBits + bytes.length * 8 <= totalData * 8) { version = v; break; }
  }
  if (!version) throw new Error('Text too long for QR versions 1–10');

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const setFunc = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; isFunc[y][x] = true; };

  // Timing patterns.
  for (let i = 0; i < size; i++) { setFunc(6, i, i % 2 === 0); setFunc(i, 6, i % 2 === 0); }
  // Finder patterns + separators.
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as Array<[number, number]>) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunc(x, y, dist !== 2 && dist !== 4);
      }
    }
  }
  // Alignment patterns (skip the three finder corners).
  const pos = ALIGN[version];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const atFinder = (i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0);
      if (atFinder) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        setFunc(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  const drawFormat = (mask: number) => {
    const dataBits = mask; // EC level M = 0b00, so the 5-bit field is just the mask.
    let rem = dataBits;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((dataBits << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFunc(8, i, getBit(bits, i));
    setFunc(8, 7, getBit(bits, 6));
    setFunc(8, 8, getBit(bits, 7));
    setFunc(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) setFunc(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) setFunc(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) setFunc(8, size - 15 + i, getBit(bits, i));
    setFunc(8, size - 8, true); // the always-dark module
  };
  drawFormat(0); // reserve the format areas

  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFunc(a, b, bit); setFunc(b, a, bit);
    }
  }

  // Place codewords in the zigzag pattern.
  const codewords = buildCodewords(bytes, version);
  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunc[y][x] && bitIdx < codewords.length * 8) {
          modules[y][x] = getBit(codewords[bitIdx >> 3], 7 - (bitIdx & 7));
          bitIdx++;
        }
      }
    }
  }

  const maskFns: Array<(x: number, y: number) => boolean> = [
    (x, y) => (x + y) % 2 === 0,
    (_x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (!isFunc[y][x] && maskFns[mask](x, y)) modules[y][x] = !modules[y][x];
    }
  };

  // Standard penalty scoring to pick the best mask.
  const penalty = (): number => {
    let score = 0;
    const runScore = (line: (i: number) => boolean) => {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (line(i) === line(i - 1)) { run++; if (i === size - 1 && run >= 5) score += 3 + (run - 5); }
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
    };
    for (let y = 0; y < size; y++) runScore((i) => modules[y][i]);
    for (let x = 0; x < size; x++) runScore((i) => modules[i][x]);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
    // Finder-like 1011101 patterns with 4 light modules on a side.
    const check = (get: (i: number) => boolean) => {
      for (let i = 0; i + 11 <= size; i++) {
        let a = 0;
        for (let j = 0; j < 11; j++) a = ((a << 1) | (get(i + j) ? 1 : 0)) & 0x7ff;
        if (a === 0b00001011101 || a === 0b10111010000) score += 40;
      }
    };
    for (let y = 0; y < size; y++) check((i) => modules[y][i]);
    for (let x = 0; x < size; x++) check((i) => modules[i][x]);
    let dark = 0;
    for (const row of modules) for (const m of row) if (m) dark++;
    const pct = (dark * 100) / (size * size);
    score += 10 * Math.floor(Math.abs(pct - 50) / 5);
    return score;
  };

  let bestMask = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const s = penalty();
    if (s < bestScore) { bestScore = s; bestMask = mask; }
    applyMask(mask); // XOR is its own inverse
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return modules;
}
