const imageInput = document.getElementById("imageInput");
const gridWidthInput = document.getElementById("gridWidth");
const showGridInput = document.getElementById("showGrid");
const renderBtn = document.getElementById("renderBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusText = document.getElementById("statusText");
const gridMeta = document.getElementById("gridMeta");
const paletteList = document.getElementById("paletteList");
const boardSummary = document.getElementById("boardSummary");
const boardOptions = document.getElementById("boardOptions");
const colorChart = document.getElementById("colorChart");
const colorSearch = document.getElementById("colorSearch");
const sourceInfo = document.getElementById("sourceInfo");
const renderInfo = document.getElementById("renderInfo");
const sizeChips = Array.from(document.querySelectorAll(".size-chip"));
const outputSvg = document.getElementById("outputSvg");

const sourceCanvas = document.getElementById("sourceCanvas");
const sourceCtx = sourceCanvas.getContext("2d");

const gridWidthValue = document.getElementById("gridWidthValue");

const state = {
  image: null,
  quantizedPixels: [],
  colorCounts: new Map(),
  gridWidth: Number(gridWidthInput.value),
  gridHeight: 0,
  cellSize: 14,
  denoiseChanges: 0,
};

const MARD_DATA = `
A1 #FAF4C8
A2 #FFFFD5
A3 #FEFF8B
A4 #FBED56
A5 #F4D738
A6 #FEAC4C
A7 #FE8B4C
A8 #FFDA45
A9 #FF995B
A10 #F77C31
A11 #FFDD99
A12 #FE9F72
A13 #FFC365
A14 #FD543D
A15 #FFF365
A16 #FFFF9F
A17 #FFE36E
A18 #FEBE7D
A19 #FD7C72
A20 #FFD568
A21 #FFE395
A22 #F4F57D
A23 #E6C9B7
A24 #F7F8A2
A25 #FFD67D
A26 #FFC830
B1 #E6EE31
B2 #63F347
B3 #9EF780
B4 #5DE035
B5 #35E352
B6 #65E2A6
B7 #3DAF80
B8 #1C9C4F
B9 #27523A
B10 #95D3C2
B11 #5D722A
B12 #166F41
B13 #CAEB7B
B14 #ADE946
B15 #2E5132
B16 #C5ED9C
B17 #9BB13A
B18 #E6EE49
B19 #24B88C
B20 #C2F0CC
B21 #156A6B
B22 #0B3C43
B23 #303A21
B24 #EEFCA5
B25 #4E846D
B26 #8D7A35
B27 #CCE1AF
B28 #9EE5B9
B29 #C5E254
B30 #E2FCB1
B31 #B0E792
B32 #9CAB5A
C1 #E8FFE7
C2 #A9F9FC
C3 #A0E2FB
C4 #41CCFF
C5 #01ACEB
C6 #50AAF0
C7 #3677D2
C8 #0F54C0
C9 #324BCA
C10 #3EBCE2
C11 #28DDDE
C12 #1C334D
C13 #CDE8FF
C14 #D5FDFF
C15 #22C4C6
C16 #1557A8
C17 #04D1F6
C18 #1D3344
C19 #1887A2
C20 #176DAF
C21 #BEDDFF
C22 #67B4BE
C23 #C8E2FF
C24 #7CC4FF
C25 #A9E5E5
C26 #3CAED8
C27 #D3DFFA
C28 #BBCFED
C29 #34488E
D1 #AEB4F2
D2 #858EDD
D3 #2F54AF
D4 #182A84
D5 #B843C5
D6 #AC7BDE
D7 #8854B3
D8 #E2D3FF
D9 #D5B9F8
D10 #361851
D11 #B9BAE1
D12 #DE9AD4
D13 #B50095
D14 #8B279B
D15 #2F1F90
D16 #E3E1EE
D17 #C4D4F6
D18 #A45EC7
D19 #D8C3D7
D20 #9C32B2
D21 #9A009B
D22 #333A95
D23 #EBDAFC
D24 #7786E5
D25 #494FC7
D26 #DFC2F8
E1 #FDD3CC
E2 #FEC0DF
E3 #FFB7E7
E4 #E8649E
E5 #F551A2
E6 #F13D74
E7 #C63478
E8 #FFDBE9
E9 #E970CC
E10 #D33793
E11 #FCDDD2
E12 #F78FC3
E13 #B5006D
E14 #FFD1BA
E15 #F8C7C9
E16 #FFF3EB
E17 #FFE2EA
E18 #FFC7DB
E19 #FEBAD5
E20 #D8C7D1
E21 #BD9DA1
E22 #B785A1
E23 #937A8D
E24 #E1BCE8
F1 #FD957B
F2 #FC3D46
F3 #F74941
F4 #FC283C
F5 #E7002F
F6 #943630
F7 #971937
F8 #BC0028
F9 #E2677A
F10 #8A4526
F11 #5A2121
F12 #FD4E6A
F13 #F35744
F14 #FFA9AD
F15 #D30022
F16 #FEC2A6
F17 #E69C79
F18 #D37C46
F19 #C1444A
F20 #CD9391
F21 #F7B4C6
F22 #FDC0D0
F23 #F67E66
F24 #E698AA
F25 #E54B4F
G1 #FFE2CE
G2 #FFC4AA
G3 #F4C3A5
G4 #E1B383
G5 #EDB045
G6 #E99C17
G7 #9D5B3E
G8 #753832
G9 #E6B483
G10 #D98C39
G11 #E0C593
G12 #FFC890
G13 #B7714A
G14 #8D614C
G15 #FCF9E0
G16 #F2D9BA
G17 #78524B
G18 #FFE4CC
G19 #E07935
G20 #A94023
G21 #B88558
H1 #FDFBFF
H2 #FEFFFF
H3 #B6B1BA
H4 #89858C
H5 #48464E
H6 #2F2B2F
H7 #000000
H8 #E7D6DB
H9 #EDEDED
H10 #EEE9EA
H11 #CECDD5
H12 #FFF5ED
H13 #F5ECD2
H14 #CFD7D3
H15 #98A6A8
H16 #1D1414
H17 #F1EDED
H18 #FFFDF0
H19 #F6EFE2
H20 #949FA3
H21 #FFFBE1
H22 #CACAD4
H23 #9A9D94
M1 #BCC6B8
M2 #8AA386
M3 #697D80
M4 #E3D2BC
M5 #D0CCAA
M6 #B0A782
M7 #B4A497
M8 #B38281
M9 #A58767
M10 #C5B2BC
M11 #9F7594
M12 #644749
M13 #D19066
M14 #C77362
M15 #757D78
P1 #FCF7F8
P2 #B0A9AC
P3 #AFDCAB
P4 #FEA49F
P5 #EE8C3E
P6 #5FD0A7
P7 #EB9270
P8 #F0D958
P9 #D9D9D9
P10 #D9C7EA
P11 #F3ECC9
P12 #E6EEF2
P13 #AACBEF
P14 #337680
P15 #668575
P16 #FEBF45
P17 #FEA324
P18 #FEB89F
P19 #FFFEEC
P20 #FEBECF
P21 #ECBEBF
P22 #E4A89F
P23 #A56268
Q1 #F2A5E8
Q2 #E9EC91
Q3 #FFFF00
Q4 #FFEBFA
Q5 #76CEDE
R1 #D50D21
R2 #F92F83
R3 #FD8324
R4 #F8EC31
R5 #35C75B
R6 #238891
R7 #19779D
R8 #1A60C3
R9 #9A56B4
R10 #FFDB4C
R11 #FFEBFA
R12 #D8D5CE
R13 #55514C
R14 #9FE4DF
R15 #77CEE9
R16 #3ECFCA
R17 #4A867A
R18 #7FCD9D
R19 #CDE55D
R20 #E8C7B4
R21 #AD6F3C
R22 #6C372F
R23 #FEB872
R24 #F3C1C0
R25 #C9675E
R26 #D293BE
R27 #EA8CB1
R28 #9C87D6
T1 #FFFFFF
Y1 #FD6FB4
Y2 #FEB481
Y3 #D7FAA0
Y4 #8BDBFA
Y5 #E987EA
ZG1 #DAABB3
ZG2 #D6AA87
ZG3 #C1BD8D
ZG4 #96869F
ZG5 #8490A6
ZG6 #94BFE2
ZG7 #E2A9D2
ZG8 #AB91C0
`;

const MARD_COLORS = MARD_DATA.trim()
  .split("\n")
  .map((line) => {
    const [code, hex] = line.trim().split(/\s+/);
    return { code, name: `MARD ${code}`, hex };
  });

const MARD_RGB = MARD_COLORS.map((color) => ({
  ...color,
  rgb: hexToRgb(color.hex),
}));

const SERIES_META = {
  A: "黄色 / 橙色系",
  B: "绿色系",
  C: "蓝青色系",
  D: "蓝紫色系",
  E: "粉紫色系",
  F: "红色系",
  G: "肤色 / 棕色系",
  H: "黑白灰 / 中性色",
  M: "莫兰迪低饱和系",
  P: "柔和粉彩系",
  Q: "荧彩亮色系",
  R: "高饱和精选系",
  T: "纯白扩展",
  Y: "荧光糖果系",
  ZG: "珠光 / 特殊质感系",
};

const SERIES_SEARCH_TERMS = {
  A: "黄色系 橙色系 暖黄",
  B: "绿色系 草绿 墨绿",
  C: "蓝色系 蓝青色系 青色系 湖蓝",
  D: "蓝色系 紫色系 蓝紫色系 靛蓝",
  E: "粉色系 粉紫色系 玫红",
  F: "红色系 朱红 酒红",
  G: "肤色 棕色系 咖色 大地色",
  H: "黑白灰 中性色 灰色系",
  M: "莫兰迪 灰调 低饱和",
  P: "粉彩 马卡龙 柔和色",
  Q: "荧彩 荧光 亮色",
  R: "高饱和 鲜艳色 综合色",
  T: "白色 纯白",
  Y: "荧光 糖果色",
  ZG: "珠光 特殊质感 金属感",
};

function updateLabels() {
  gridWidthValue.textContent = String(gridWidthInput.value);
  sizeChips.forEach((chip) => {
    chip.classList.toggle(
      "active",
      chip.dataset.width === gridWidthInput.value,
    );
  });
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function squaredDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function nearestMardColor(pixel) {
  let nearest = MARD_RGB[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const color of MARD_RGB) {
    const distance = squaredDistance(pixel, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = color;
    }
  }

  return nearest;
}

function parseSeries(code) {
  return code.match(/^[A-Z]+/)?.[0] || "其他";
}

function getSeriesLabel(series) {
  return SERIES_META[series] || "未分类";
}

function drawSourcePreview(image, maxWidth = 520, maxHeight = 520) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  sourceCanvas.width = Math.max(1, Math.round(image.width * scale));
  sourceCanvas.height = Math.max(1, Math.round(image.height * scale));
  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
}

function getPreviewCellSize(width, height) {
  const longestSide = Math.max(width, height);
  if (longestSide <= 24) {
    return 30;
  }
  if (longestSide <= 40) {
    return 24;
  }
  if (longestSide <= 64) {
    return 18;
  }
  if (longestSide <= 104) {
    return 14;
  }
  return 10;
}

function getEffectiveGridSize(image) {
  const maxGridWidth = Number(gridWidthInput.value);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const effectiveWidth = Math.max(1, Math.min(maxGridWidth, sourceWidth));
  const effectiveHeight = Math.max(
    1,
    Math.round(effectiveWidth * (sourceHeight / sourceWidth)),
  );

  return {
    width: effectiveWidth,
    height: effectiveHeight,
    sourceWidth,
    sourceHeight,
    wasUpscaled: effectiveWidth > sourceWidth,
    wasDownscaled: effectiveWidth < sourceWidth,
  };
}

function denoisePixels(pixels, width, height) {
  const result = [...pixels];
  let changes = 0;
  const directions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const current = pixels[index];
      const neighborCounts = new Map();
      let sameCount = 0;

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const neighbor = pixels[ny * width + nx];
        neighborCounts.set(
          neighbor.code,
          (neighborCounts.get(neighbor.code) || 0) + 1,
        );
        if (neighbor.code === current.code) {
          sameCount += 1;
        }
      }

      // 如果已经有至少2个相同邻居，则保留当前像素
      if (sameCount >= 2) {
        continue;
      }

      // 找到最常见的邻居颜色
      let bestCode = current.code;
      let bestCount = 0;
      for (const [code, count] of neighborCounts.entries()) {
        if (code !== current.code && count > bestCount) {
          bestCode = code;
          bestCount = count;
        }
      }

      // 只有当满足以下条件时才替换：
      // 1. 最佳邻居颜色出现次数 >= 6 (8个方向中的大多数)
      // 2. 当前像素没有任何相同颜色的邻居 (完全孤立)
      if (bestCode !== current.code && bestCount >= 6 && sameCount === 0) {
        const replacement = MARD_RGB.find((color) => color.code === bestCode);
        if (replacement) {
          result[index] = replacement;
          changes += 1;
        }
      }

      // 添加额外检查：如果当前像素是小区域的一部分（如眼睛、小细节等），则保留它
      // 检查是否这是一个小的相同颜色区域
      else if (bestCode !== current.code && sameCount === 0 && bestCount >= 4) {
        // 检查这个像素是否属于一个小的连通区域
        let connectedCount = 1; // 包括自己
        // 检查周围两圈的像素，看是否存在同色连接
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              const neighbor = pixels[ny * width + nx];
              if (neighbor.code === current.code) {
                connectedCount++;
              }
            }
          }
        }

        // 如果这个颜色区域非常小（如1-3个像素），可能是重要的细节，保留它
        if (connectedCount <= 3) {
          // 保持原样，不替换
        } else {
          // 如果区域较大，可以考虑替换
          if (bestCount >= 6) {
            const replacement = MARD_RGB.find(
              (color) => color.code === bestCode,
            );
            if (replacement) {
              result[index] = replacement;
              changes += 1;
            }
          }
        }
      }
    }
  }

  return { pixels: result, changes };
}

function renderPaletteList(colorCounts) {
  const entries = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    paletteList.className = "palette-list empty-state";
    paletteList.textContent = "还没有颜色统计。";
    return;
  }

  paletteList.className = "palette-list";
  paletteList.innerHTML = "";

  for (const [code, count] of entries) {
    const color = MARD_COLORS.find((item) => item.code === code);
    const item = document.createElement("div");
    item.className = "palette-item";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = color.hex;

    const meta = document.createElement("div");
    meta.className = "palette-meta";
    meta.innerHTML = `<div class="palette-code">MARD ${color.code}</div><strong>${color.name}</strong><span>${color.hex}</span>`;

    const hexTag = document.createElement("div");
    hexTag.className = "palette-code";
    hexTag.textContent = color.hex;

    const beadCount = document.createElement("div");
    beadCount.className = "palette-count";
    beadCount.textContent = `${count}`;

    item.append(swatch, meta, hexTag, beadCount);
    paletteList.appendChild(item);
  }
}

function renderBoardSummary() {
  const width = state.gridWidth;
  const height = state.gridHeight;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const recommended = longSide <= 52 ? 52 : 104;
  const recommendedCount =
    Math.ceil(width / recommended) * Math.ceil(height / recommended);

  boardSummary.innerHTML = `当前图案尺寸为 <strong>${width} × ${height}</strong> 格。推荐使用 <strong>${recommended} × ${recommended}</strong> 规格板，共 <strong>${recommendedCount}</strong> 块。`;

  boardOptions.innerHTML = "";
  [52, 104].forEach((size) => {
    const count = Math.ceil(width / size) * Math.ceil(height / size);
    const option = document.createElement("div");
    option.className = "board-option";
    option.innerHTML = `<strong>${size} × ${size} 规格</strong><span>${width} × ${height} 格需要 ${count} 块板子</span>`;
    boardOptions.appendChild(option);
  });

  if (shortSide > 104 || longSide > 104) {
    const note = document.createElement("div");
    note.className = "board-option";
    note.innerHTML = `<strong>拼接提示</strong><span>当前图案已超过单块 104 × 104，需要多块板子拼接制作。</span>`;
    boardOptions.appendChild(note);
  }
}

function updateRenderInfo(text) {
  renderInfo.textContent = text;
}

function renderColorChart() {
  const keyword = colorSearch.value.trim().toLowerCase();
  const grouped = MARD_COLORS.reduce((acc, color) => {
    const series = parseSeries(color.code);
    const label = getSeriesLabel(series);
    const searchText = [
      color.code,
      color.hex,
      color.name,
      series,
      label,
      SERIES_SEARCH_TERMS[series] || "",
      `mard ${color.code}`,
    ]
      .join(" ")
      .toLowerCase();

    if (keyword && !searchText.includes(keyword)) {
      return acc;
    }

    if (!acc.has(series)) {
      acc.set(series, []);
    }
    acc.get(series).push(color);
    return acc;
  }, new Map());

  colorChart.innerHTML = "";

  if (!grouped.size) {
    colorChart.innerHTML = `<div class="chart-empty">没有匹配到色号，请换个关键词试试。</div>`;
    return;
  }

  for (const [series, colors] of grouped.entries()) {
    const section = document.createElement("section");
    section.className = "chart-section";

    const header = document.createElement("div");
    header.className = "chart-section-header";
    header.innerHTML = `<div><h3>${series} 系列</h3><p>${getSeriesLabel(series)}</p></div><p>${colors.length} 色</p>`;

    const grid = document.createElement("div");
    grid.className = "chart-grid";

    for (const color of colors) {
      const item = document.createElement("div");
      item.className = "chart-item";
      item.innerHTML = `<div class="chart-swatch" style="background:${color.hex}"></div><div><strong>MARD ${color.code}</strong><span>${getSeriesLabel(series)}</span><span>${color.hex}</span></div>`;
      grid.appendChild(item);
    }

    section.append(header, grid);
    colorChart.appendChild(section);
  }
}

function drawLegendBlock(ctx, entries, startX, startY, maxWidth) {
  const itemHeight = 28;
  const swatchSize = 16;
  const minColumnWidth = 190;
  const columns = Math.max(1, Math.floor(maxWidth / minColumnWidth));
  const columnWidth = Math.floor(maxWidth / columns);

  entries.forEach(([code, count], index) => {
    const color = MARD_COLORS.find((item) => item.code === code);
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + col * columnWidth;
    const y = startY + row * itemHeight;

    ctx.fillStyle = color.hex;
    ctx.fillRect(x, y + 5, swatchSize, swatchSize);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.strokeRect(x, y + 5, swatchSize, swatchSize);

    ctx.fillStyle = "#2d1f18";
    ctx.font = "600 12px 'Noto Sans SC', sans-serif";
    ctx.fillText(`MARD ${code}`, x + 24, y + 10);

    ctx.fillStyle = "#745f52";
    ctx.font = "12px 'Noto Sans SC', sans-serif";
    ctx.fillText(`${color.hex}  ·  ${count} 颗`, x + 24, y + 24);
  });

  return Math.ceil(entries.length / columns) * itemHeight;
}

function renderSvgPattern(pixels, width, height, cellSize, showGrid) {
  const ns = "http://www.w3.org/2000/svg";
  const svgWidth = width * cellSize;
  const svgHeight = height * cellSize;

  outputSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  outputSvg.setAttribute("width", String(svgWidth));
  outputSvg.setAttribute("height", String(svgHeight));
  outputSvg.innerHTML = "";

  const background = document.createElementNS(ns, "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", String(svgWidth));
  background.setAttribute("height", String(svgHeight));
  background.setAttribute("fill", "#ffffff");
  outputSvg.appendChild(background);

  pixels.forEach((color, index) => {
    const x = (index % width) * cellSize;
    const y = Math.floor(index / width) * cellSize;
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(cellSize));
    rect.setAttribute("height", String(cellSize));
    rect.setAttribute("fill", color.hex);
    if (showGrid) {
      rect.setAttribute("stroke", "rgba(61, 36, 24, 0.24)");
      rect.setAttribute("stroke-width", "1");
      rect.setAttribute("vector-effect", "non-scaling-stroke");
    }
    outputSvg.appendChild(rect);

    // 添加色值文本标签 - 现在无论格子大小如何都会显示
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(x + cellSize / 2));
    text.setAttribute("y", String(y + cellSize / 2));
    // 根据格子大小动态调整字体大小
    const fontSize = Math.max(6, cellSize * 0.4);
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    // 根据背景色决定文字颜色以提高可读性
    const brightness =
      (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
    text.setAttribute("fill", brightness > 128 ? "#000000" : "#FFFFFF");
    text.setAttribute("pointer-events", "none"); // 防止文本影响点击事件
    text.textContent = color.code; // 显示色号

    outputSvg.appendChild(text);
  });
}

function exportPatternWithLegend() {
  const entries = [...state.colorCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return;
  }

  const exportCellSize = 20;
  const padding = 28;
  const titleHeight = 84;
  const patternWidth = state.gridWidth * exportCellSize;
  const patternHeight = state.gridHeight * exportCellSize;
  const legendWidth = Math.max(patternWidth, 820);
  const legendHeightEstimate =
    Math.ceil(entries.length / Math.max(1, Math.floor(legendWidth / 190))) * 28;
  const footerHeight = 88 + legendHeightEstimate;

  const canvas = document.createElement("canvas");
  canvas.width = patternWidth + padding * 2;
  canvas.height = titleHeight + patternHeight + footerHeight + padding * 2;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fffaf6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2d1f18";
  ctx.font = "700 28px 'Noto Sans SC', sans-serif";
  ctx.fillText("MARD 拼豆图图例", padding, 42);

  ctx.fillStyle = "#745f52";
  ctx.font = "14px 'Noto Sans SC', sans-serif";
  const recommended =
    Math.max(state.gridWidth, state.gridHeight) <= 52 ? 52 : 104;
  const boardCount =
    Math.ceil(state.gridWidth / recommended) *
    Math.ceil(state.gridHeight / recommended);
  ctx.fillText(
    `${state.gridWidth} × ${state.gridHeight} 格  ·  ${state.gridWidth * state.gridHeight} 颗  ·  推荐 ${recommended}×${recommended} 板 ${boardCount} 块`,
    padding,
    66,
  );

  state.quantizedPixels.forEach((color, index) => {
    const x = index % state.gridWidth;
    const y = Math.floor(index / state.gridWidth);
    const left = padding + x * exportCellSize;
    const top = titleHeight + y * exportCellSize;

    ctx.fillStyle = color.hex;
    ctx.fillRect(left, top, exportCellSize, exportCellSize);

    if (showGridInput.checked) {
      ctx.strokeStyle = "rgba(61, 36, 24, 0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(left, top, exportCellSize, exportCellSize);
    }

    // 添加色号文本
    const fontSize = Math.max(6, exportCellSize * 0.4);
    ctx.font = `${fontSize}px 'Noto Sans SC', sans-serif`;

    // 根据背景色决定文字颜色以提高可读性
    const brightness =
      (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000;
    ctx.fillStyle = brightness > 128 ? "#000000" : "#FFFFFF";

    // 居中放置文本
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      color.code,
      left + exportCellSize / 2,
      top + exportCellSize / 2,
    );
  });

  ctx.fillStyle = "#2d1f18";
  ctx.font = "700 18px 'Noto Sans SC', sans-serif";
  const legendTop = titleHeight + patternHeight + 36;
  ctx.fillText("MARD 色号图例", padding, legendTop);

  drawLegendBlock(
    ctx,
    entries,
    padding,
    legendTop + 18,
    canvas.width - padding * 2,
  );

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `mard-pattern-${state.gridWidth}x${state.gridHeight}.png`;
  link.click();
}

function renderBeadPattern() {
  if (!state.image) {
    return;
  }

  const gridSize = getEffectiveGridSize(state.image);
  state.gridWidth = gridSize.width;
  state.gridHeight = gridSize.height;

  const offscreen = document.createElement("canvas");
  offscreen.width = state.gridWidth;
  offscreen.height = state.gridHeight;
  const offscreenCtx = offscreen.getContext("2d", { willReadFrequently: true });
  offscreenCtx.imageSmoothingEnabled = true;
  offscreenCtx.drawImage(state.image, 0, 0, state.gridWidth, state.gridHeight);

  const imageData = offscreenCtx.getImageData(
    0,
    0,
    state.gridWidth,
    state.gridHeight,
  );
  const mappedPixels = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    mappedPixels.push(
      nearestMardColor([
        imageData.data[i],
        imageData.data[i + 1],
        imageData.data[i + 2],
      ]),
    );
  }
  const denoised = denoisePixels(
    mappedPixels,
    state.gridWidth,
    state.gridHeight,
  );
  const pixels = denoised.pixels;
  state.quantizedPixels = pixels;
  state.denoiseChanges = denoised.changes;
  state.cellSize = getPreviewCellSize(state.gridWidth, state.gridHeight);

  const counts = new Map();

  pixels.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    const hex = color.hex || rgbToHex(r, g, b);

    counts.set(color.code, (counts.get(color.code) || 0) + 1);
  });

  state.colorCounts = counts;
  renderSvgPattern(
    pixels,
    state.gridWidth,
    state.gridHeight,
    state.cellSize,
    showGridInput.checked,
  );
  renderPaletteList(counts);
  renderBoardSummary();
  const scaleNote = gridSize.wasDownscaled
    ? `已从原图 ${gridSize.sourceWidth} × ${gridSize.sourceHeight} 缩小到 ${state.gridWidth} × ${state.gridHeight} 格`
    : `保留原图像素尺寸 ${state.gridWidth} × ${state.gridHeight} 格`;
  gridMeta.textContent = `${state.gridWidth} × ${state.gridHeight} 格，共 ${
    state.gridWidth * state.gridHeight
  } 颗拼豆，已映射到 MARD 官方色号`;
  const denoiseNote = state.denoiseChanges
    ? `已清理 ${state.denoiseChanges} 处孤立杂色`
    : "未检测到明显杂色";
  statusText.textContent = `拼豆图已生成，${scaleNote}，${denoiseNote}。`;
  updateRenderInfo(
    `${state.gridWidth} × ${state.gridHeight} 格 · 预览 ${state.cellSize}px/格`,
  );
  downloadBtn.disabled = false;
}

function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    state.image = image;
    const suggestedWidth = Math.min(image.naturalWidth || image.width, 104);
    gridWidthInput.value = String(Math.max(16, suggestedWidth));
    updateLabels();
    drawSourcePreview(image);
    sourceInfo.textContent = `原图尺寸：${image.naturalWidth || image.width} × ${
      image.naturalHeight || image.height
    } px`;
    renderBtn.disabled = false;
    statusText.textContent = "图片已载入，正在生成拼豆图...";
    renderBeadPattern();
    URL.revokeObjectURL(objectUrl);
  };

  image.onerror = () => {
    statusText.textContent = "图片读取失败，请换一张图片试试。";
    URL.revokeObjectURL(objectUrl);
  };

  image.src = objectUrl;
}

imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  loadImage(file);
});

renderBtn.addEventListener("click", renderBeadPattern);

downloadBtn.addEventListener("click", exportPatternWithLegend);

gridWidthInput.addEventListener("input", updateLabels);
sizeChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    gridWidthInput.value = chip.dataset.width;
    updateLabels();
    if (state.image) {
      renderBeadPattern();
    }
  });
});

[gridWidthInput, showGridInput].forEach((input) => {
  input.addEventListener("change", () => {
    if (state.image) {
      renderBeadPattern();
    }
  });
});

colorSearch.addEventListener("input", renderColorChart);

updateLabels();
renderColorChart();
boardSummary.innerHTML =
  "等待图片。当前色表已切换为 MARD，并按你提供的 Pixel-Beads 色卡页接入。";
sourceInfo.textContent = "等待图片...";
updateRenderInfo("未生成");
