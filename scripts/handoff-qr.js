// Compact QR encoder (byte mode, EC level L) for host handoff payloads.
(function (root) {
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGf() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  const TOTAL_CW = [
    0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
    733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
    2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
  ];
  const EC_PER_BLOCK_L = [
    0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
    28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
  ];
  const BLOCKS_L = [
    0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
    12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25
  ];
  const ALIGN_POS = [
    [], [],
    [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
    [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
    [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
  ];

  function blockPlan(version) {
    const totalCw = TOTAL_CW[version];
    const ec = EC_PER_BLOCK_L[version];
    const blocks = BLOCKS_L[version];
    const totalData = totalCw - ec * blocks;
    const shortDataLen = Math.floor(totalData / blocks);
    const longBlocks = totalData % blocks;
    const shortBlocks = blocks - longBlocks;
    return { ec, shortBlocks, shortDataLen, longBlocks, longDataLen: shortDataLen + 1, totalData };
  }

  function byteCapacity(version) {
    const { totalData } = blockPlan(version);
    const countBits = version <= 9 ? 8 : 16;
    return Math.floor((totalData * 8 - 4 - countBits) / 8);
  }

  function gfPolyMul(p, q) {
    const out = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      for (let j = 0; j < q.length; j++) out[i + j] ^= gfMul(p[i], q[j]);
    }
    return out;
  }

  function rsGenerator(ecCount) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < ecCount; i++) {
      poly = gfPolyMul(poly, new Uint8Array([1, EXP[i]]));
    }
    return poly;
  }

  function rsEncode(data, ecCount) {
    const gen = rsGenerator(ecCount);
    const rec = new Uint8Array(data.length + ecCount);
    rec.set(data);
    for (let i = 0; i < data.length; i++) {
      const factor = rec[i];
      if (factor === 0) continue;
      for (let j = 1; j < gen.length; j++) rec[i + j] ^= gfMul(gen[j], factor);
    }
    return rec.slice(data.length);
  }

  function pushBits(bits, value, length) {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  }

  function buildDataCodewords(bytes, version) {
    const plan = blockPlan(version);
    const countBits = version <= 9 ? 8 : 16;
    const bits = [];
    pushBits(bits, 0b0100, 4);
    pushBits(bits, bytes.length, countBits);
    bytes.forEach(b => pushBits(bits, b, 8));
    const capacityBits = plan.totalData * 8;
    const term = Math.min(4, capacityBits - bits.length);
    for (let i = 0; i < term; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    const pad = [0xec, 0x11];
    let padIdx = 0;
    while (bits.length < capacityBits) {
      pushBits(bits, pad[padIdx], 8);
      padIdx ^= 1;
    }
    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      codewords.push(v);
    }
    return codewords;
  }

  function interleave(codewords, version) {
    const plan = blockPlan(version);
    const blocks = [];
    let offset = 0;
    for (let i = 0; i < plan.shortBlocks; i++) {
      const data = codewords.slice(offset, offset + plan.shortDataLen);
      offset += plan.shortDataLen;
      blocks.push({ data, ec: rsEncode(Uint8Array.from(data), plan.ec) });
    }
    for (let i = 0; i < plan.longBlocks; i++) {
      const data = codewords.slice(offset, offset + plan.longDataLen);
      offset += plan.longDataLen;
      blocks.push({ data, ec: rsEncode(Uint8Array.from(data), plan.ec) });
    }
    const out = [];
    const maxData = Math.max(plan.shortDataLen, plan.longDataLen);
    for (let i = 0; i < maxData; i++) {
      blocks.forEach(block => {
        if (i < block.data.length) out.push(block.data[i]);
      });
    }
    for (let i = 0; i < plan.ec; i++) {
      blocks.forEach(block => out.push(block.ec[i]));
    }
    return out;
  }

  function maskFn(mask, row, col) {
    switch (mask) {
      case 0: return (row + col) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return col % 3 === 0;
      case 3: return (row + col) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
      case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
      case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
      default: return false;
    }
  }

  function placeFinder(matrix, func, row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || cc < 0 || rr >= matrix.length || cc >= matrix.length) continue;
        const inPattern = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inPattern && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        matrix[rr][cc] = dark ? 1 : 0;
        func[rr][cc] = 1;
      }
    }
  }

  function placeAlignment(matrix, func, row, col) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const dark = Math.max(Math.abs(r), Math.abs(c)) === 2 || (r === 0 && c === 0);
        matrix[row + r][col + c] = dark ? 1 : 0;
        func[row + r][col + c] = 1;
      }
    }
  }

  function formatBits(mask) {
    const data = (1 << 3) | mask;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= 0b10100110111 << (i - 10);
    }
    return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
  }

  function versionBits(version) {
    let rem = version << 12;
    for (let i = 17; i >= 12; i--) {
      if ((rem >>> i) & 1) rem ^= 0b1111100100101 << (i - 12);
    }
    return (version << 12) | (rem & 0xfff);
  }

  function placeFormat(matrix, mask) {
    const bits = formatBits(mask);
    const n = matrix.length;
    const bitAt = i => (bits >> i) & 1;
    for (let i = 0; i <= 5; i++) matrix[8][i] = bitAt(i);
    matrix[8][7] = bitAt(6);
    matrix[8][8] = bitAt(7);
    matrix[7][8] = bitAt(8);
    for (let i = 9; i < 15; i++) matrix[14 - i][8] = bitAt(i);
    for (let i = 0; i < 8; i++) matrix[n - 1 - i][8] = bitAt(i);
    for (let i = 8; i < 15; i++) matrix[8][n - 15 + i] = bitAt(i);
    matrix[n - 8][8] = 1;
  }

  function placeVersion(matrix, version) {
    if (version < 7) return;
    const bits = versionBits(version);
    const n = matrix.length;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      const a = Math.floor(i / 3);
      const b = i % 3;
      matrix[a][n - 11 + b] = bit;
      matrix[n - 11 + b][a] = bit;
    }
  }

  function buildFunctionGrid(version) {
    const n = version * 4 + 17;
    const matrix = Array.from({ length: n }, () => new Uint8Array(n));
    const func = Array.from({ length: n }, () => new Uint8Array(n));
    placeFinder(matrix, func, 0, 0);
    placeFinder(matrix, func, 0, n - 7);
    placeFinder(matrix, func, n - 7, 0);
    for (let i = 8; i < n - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      func[6][i] = 1;
      func[i][6] = 1;
    }
    ALIGN_POS[version].forEach(r => {
      ALIGN_POS[version].forEach(c => {
        if ((r === 6 && c === 6) || (r === 6 && c === n - 7) || (r === n - 7 && c === 6)) return;
        placeAlignment(matrix, func, r, c);
      });
    });
    for (let i = 0; i < 9; i++) {
      func[8][i] = 1;
      func[i][8] = 1;
    }
    for (let i = 0; i < 8; i++) {
      func[8][n - 1 - i] = 1;
      func[n - 1 - i][8] = 1;
    }
    func[n - 8][8] = 1;
    if (version >= 7) {
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
          func[i][n - 11 + j] = 1;
          func[n - 11 + j][i] = 1;
        }
      }
    }
    return { matrix, func, n };
  }

  function placeData(matrix, func, codewords, mask) {
    const n = matrix.length;
    const bits = [];
    codewords.forEach(cw => {
      for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
    });
    let bitIndex = 0;
    let upward = true;
    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let i = 0; i < n; i++) {
        const row = upward ? n - 1 - i : i;
        for (let d = 0; d < 2; d++) {
          const c = col - d;
          if (func[row][c]) continue;
          const bit = bitIndex < bits.length ? bits[bitIndex] : 0;
          bitIndex++;
          matrix[row][c] = maskFn(mask, row, c) ? bit ^ 1 : bit;
        }
      }
      upward = !upward;
    }
  }

  function scoreMatrix(matrix) {
    const n = matrix.length;
    let score = 0;
    for (let r = 0; r < n; r++) {
      let run = 1;
      for (let c = 1; c <= n; c++) {
        if (c < n && matrix[r][c] === matrix[r][c - 1]) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
    }
    for (let c = 0; c < n; c++) {
      let run = 1;
      for (let r = 1; r <= n; r++) {
        if (r < n && matrix[r][c] === matrix[r - 1][c]) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
    }
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const v = matrix[r][c];
        if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) score += 3;
      }
    }
    const finder = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const finderRev = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function hasPattern(line, pattern) {
      for (let i = 0; i <= line.length - pattern.length; i++) {
        let ok = true;
        for (let j = 0; j < pattern.length; j++) {
          if (line[i + j] !== pattern[j]) { ok = false; break; }
        }
        if (ok) return true;
      }
      return false;
    }
    for (let r = 0; r < n; r++) {
      const row = Array.from(matrix[r]);
      for (let i = 0; i <= n - 11; i++) {
        if (hasPattern(row.slice(i, i + 11), finder) || hasPattern(row.slice(i, i + 11), finderRev)) score += 40;
      }
    }
    for (let c = 0; c < n; c++) {
      const col = [];
      for (let r = 0; r < n; r++) col.push(matrix[r][c]);
      for (let i = 0; i <= n - 11; i++) {
        if (hasPattern(col.slice(i, i + 11), finder) || hasPattern(col.slice(i, i + 11), finderRev)) score += 40;
      }
    }
    let dark = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) if (matrix[r][c]) dark++;
    }
    score += 10 * Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5);
    return score;
  }

  function cloneGrid(grid) {
    return grid.map(row => Uint8Array.from(row));
  }

  function encodeQrMatrix(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let version = 1;
    while (version <= 40 && byteCapacity(version) < bytes.length) version++;
    if (version > 40) {
      throw new Error("Handoff data is too large for a single QR code.");
    }
    const codewords = interleave(buildDataCodewords(bytes, version), version);
    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const { matrix, func } = buildFunctionGrid(version);
      placeData(matrix, func, codewords, mask);
      placeFormat(matrix, mask);
      placeVersion(matrix, version);
      const score = scoreMatrix(matrix);
      if (score < bestScore) {
        bestScore = score;
        best = cloneGrid(matrix);
      }
    }
    return best;
  }

  function drawQrOnCanvas(canvas, text, cssSize = 280) {
    const matrix = encodeQrMatrix(text);
    const quiet = 2;
    const dim = matrix.length + quiet * 2;
    const scale = 4;
    canvas.width = dim * scale;
    canvas.height = dim * scale;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (!matrix[r][c]) continue;
        ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
    return matrix.length;
  }

  root.encodeQrMatrix = encodeQrMatrix;
  root.drawQrOnCanvas = drawQrOnCanvas;
  root.qrByteCapacity = byteCapacity;
})(window);
