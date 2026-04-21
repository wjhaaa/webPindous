const { MARD_COLORS, buildColorSections } = require("../../utils/mard-data");

function squaredDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function nearestMardColor(pixel) {
  let nearest = MARD_COLORS[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const color of MARD_COLORS) {
    const distance = squaredDistance(pixel, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = color;
    }
  }

  return nearest;
}

function getPreviewCellSize(width, height) {
  const longestSide = Math.max(width, height);
  if (longestSide <= 24) return 30;
  if (longestSide <= 40) return 24;
  if (longestSide <= 64) return 18;
  if (longestSide <= 104) return 14;
  return 10;
}

function getEffectiveGridSize(sourceWidth, sourceHeight, maxGridWidth) {
  const effectiveWidth = Math.max(1, Math.min(maxGridWidth, sourceWidth));
  const effectiveHeight = Math.max(
    1,
    Math.round(effectiveWidth * (sourceHeight / sourceWidth))
  );

  return {
    width: effectiveWidth,
    height: effectiveHeight,
    wasDownscaled: effectiveWidth < sourceWidth
  };
}

function denoisePixels(pixels, width, height) {
  const result = [...pixels];
  let changes = 0;
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],            [1, 0],
    [-1, 1],  [0, 1],   [1, 1]
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
        neighborCounts.set(neighbor.code, (neighborCounts.get(neighbor.code) || 0) + 1);
        if (neighbor.code === current.code) {
          sameCount += 1;
        }
      }

      if (sameCount >= 2) {
        continue;
      }

      let bestCode = current.code;
      let bestCount = 0;
      for (const [code, count] of neighborCounts.entries()) {
        if (code !== current.code && count > bestCount) {
          bestCode = code;
          bestCount = count;
        }
      }

      if (bestCode !== current.code && bestCount >= 4) {
        const replacement = MARD_COLORS.find((item) => item.code === bestCode);
        if (replacement) {
          result[index] = replacement;
          changes += 1;
        }
      }
    }
  }

  return { pixels: result, changes };
}

function makeSizePresets(activeValue) {
  return [16, 29, 52, 104].map((value) => ({
    value,
    active: Number(activeValue) === value
  }));
}

function nextTick() {
  return new Promise((resolve) => wx.nextTick(resolve));
}

function chooseMedia() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: resolve,
      fail: reject
    });
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject
    });
  });
}

function canvasToTempFilePath(canvas) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType: "png",
      quality: 1,
      success: resolve,
      fail: reject
    });
  });
}

Page({
  data: {
    gridWidth: 52,
    showGrid: true,
    sourceInfo: "等待图片...",
    statusText: "请先上传一张图片。",
    boardSummary: "等待图片...",
    boardOptions: [],
    gridMeta: "等待图片...",
    renderInfo: "未生成",
    colorSearch: "",
    colorSections: buildColorSections(""),
    usedColors: [],
    sourceCanvasStyle: "width: 320px; height: 220px;",
    previewCanvasStyle: "width: 320px; height: 220px;",
    sizePresets: makeSizePresets(52),
    canExport: false,
    hasImage: false
  },

  state: {
    imagePath: "",
    imageInfo: null,
    sourceCanvas: null,
    sourceCtx: null,
    previewCanvas: null,
    previewCtx: null,
    processCanvas: null,
    processCtx: null,
    exportCanvas: null,
    exportCtx: null,
    currentImage: null,
    gridWidth: 0,
    gridHeight: 0,
    cellSize: 0,
    quantizedPixels: [],
    usedColors: [],
    denoiseChanges: 0,
    dpr: 1
  },

  async onReady() {
    this.state.dpr = wx.getWindowInfo().pixelRatio || 1;
    await this.initCanvases();
  },

  async initCanvases() {
    const query = wx.createSelectorQuery().in(this);
    query.select("#sourceCanvas").fields({ node: true, size: true });
    query.select("#previewCanvas").fields({ node: true, size: true });
    query.select("#processCanvas").fields({ node: true, size: true });
    query.select("#exportCanvas").fields({ node: true, size: true });

    const [sourceNode, previewNode, processNode, exportNode] = await new Promise((resolve) => {
      query.exec(resolve);
    });

    this.state.sourceCanvas = sourceNode.node;
    this.state.sourceCtx = sourceNode.node.getContext("2d");
    this.state.previewCanvas = previewNode.node;
    this.state.previewCtx = previewNode.node.getContext("2d");
    this.state.processCanvas = processNode.node;
    this.state.processCtx = processNode.node.getContext("2d");
    this.state.exportCanvas = exportNode.node;
    this.state.exportCtx = exportNode.node.getContext("2d");
  },

  handleWidthChanging(event) {
    const value = Number(event.detail.value);
    this.setData({
      gridWidth: value,
      sizePresets: makeSizePresets(value)
    });
  },

  handleWidthChange(event) {
    const value = Number(event.detail.value);
    this.setData({
      gridWidth: value,
      sizePresets: makeSizePresets(value)
    });

    if (this.data.hasImage) {
      this.renderPattern();
    }
  },

  handlePresetTap(event) {
    const value = Number(event.currentTarget.dataset.width);
    this.setData({
      gridWidth: value,
      sizePresets: makeSizePresets(value)
    });

    if (this.data.hasImage) {
      this.renderPattern();
    }
  },

  handleToggleGrid(event) {
    this.setData({ showGrid: event.detail.value });
    if (this.data.hasImage) {
      this.renderPattern();
    }
  },

  handleSearchInput(event) {
    const value = event.detail.value;
    this.setData({
      colorSearch: value,
      colorSections: buildColorSections(value)
    });
  },

  async handleChooseImage() {
    try {
      const media = await chooseMedia();
      const imagePath = media.tempFiles[0].tempFilePath;
      const imageInfo = await getImageInfo(imagePath);
      const suggestedWidth = Math.max(16, Math.min(imageInfo.width, 104));

      this.state.imagePath = imagePath;
      this.state.imageInfo = imageInfo;

      this.setData({
        hasImage: true,
        canExport: false,
        gridWidth: suggestedWidth,
        sizePresets: makeSizePresets(suggestedWidth),
        sourceInfo: `原图尺寸：${imageInfo.width} × ${imageInfo.height} px`,
        statusText: "图片已载入，正在生成拼豆图..."
      });

      await nextTick();
      await this.drawSourcePreview();
      await this.renderPattern();
    } catch (error) {
      wx.showToast({
        title: "图片读取失败",
        icon: "none"
      });
    }
  },

  handleRender() {
    if (!this.data.hasImage) {
      return;
    }
    this.renderPattern();
  },

  loadImageForCanvas(canvas, path) {
    return new Promise((resolve, reject) => {
      const image = canvas.createImage();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = path;
    });
  },

  async drawSourcePreview() {
    if (!this.state.imagePath || !this.state.sourceCanvas) {
      return;
    }

    const { width, height } = this.state.imageInfo;
    const maxWidth = 320;
    const maxHeight = 240;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    const displayWidth = Math.max(1, Math.round(width * scale));
    const displayHeight = Math.max(1, Math.round(height * scale));
    const dpr = this.state.dpr;

    const image = await this.loadImageForCanvas(this.state.sourceCanvas, this.state.imagePath);
    this.state.currentImage = image;

    this.state.sourceCanvas.width = displayWidth * dpr;
    this.state.sourceCanvas.height = displayHeight * dpr;
    this.state.sourceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.state.sourceCtx.clearRect(0, 0, displayWidth, displayHeight);
    this.state.sourceCtx.drawImage(image, 0, 0, displayWidth, displayHeight);

    this.setData({
      sourceCanvasStyle: `width: ${displayWidth}px; height: ${displayHeight}px;`
    });
  },

  buildBoardInfo(width, height) {
    const longSide = Math.max(width, height);
    const recommended = longSide <= 52 ? 52 : 104;
    const recommendedCount = Math.ceil(width / recommended) * Math.ceil(height / recommended);
    const boardOptions = [52, 104].map((size) => ({
      title: `${size} × ${size} 规格`,
      text: `${width} × ${height} 格需要 ${Math.ceil(width / size) * Math.ceil(height / size)} 块板子`
    }));

    if (longSide > 104) {
      boardOptions.push({
        title: "拼接提示",
        text: "当前图案已超过单块 104 × 104，需要多块板子拼接制作。"
      });
    }

    return {
      boardSummary: `当前图案尺寸为 ${width} × ${height} 格。推荐使用 ${recommended} × ${recommended} 规格板，共 ${recommendedCount} 块。`,
      boardOptions
    };
  },

  async renderPattern() {
    if (!this.state.currentImage || !this.state.processCanvas) {
      return;
    }

    const { width: sourceWidth, height: sourceHeight } = this.state.imageInfo;
    const gridSize = getEffectiveGridSize(sourceWidth, sourceHeight, this.data.gridWidth);

    this.state.gridWidth = gridSize.width;
    this.state.gridHeight = gridSize.height;
    this.state.cellSize = getPreviewCellSize(gridSize.width, gridSize.height);

    this.state.processCanvas.width = gridSize.width;
    this.state.processCanvas.height = gridSize.height;
    this.state.processCtx.clearRect(0, 0, gridSize.width, gridSize.height);
    this.state.processCtx.drawImage(this.state.currentImage, 0, 0, gridSize.width, gridSize.height);

    const imageData = this.state.processCtx.getImageData(0, 0, gridSize.width, gridSize.height);
    const mappedPixels = [];

    for (let i = 0; i < imageData.data.length; i += 4) {
      mappedPixels.push(
        nearestMardColor([
          imageData.data[i],
          imageData.data[i + 1],
          imageData.data[i + 2]
        ])
      );
    }

    const denoised = denoisePixels(mappedPixels, gridSize.width, gridSize.height);
    this.state.quantizedPixels = denoised.pixels;
    this.state.denoiseChanges = denoised.changes;

    this.drawPreviewCanvas();

    const colorCounts = new Map();
    this.state.quantizedPixels.forEach((color) => {
      colorCounts.set(color.code, (colorCounts.get(color.code) || 0) + 1);
    });

    const usedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => {
        const color = MARD_COLORS.find((item) => item.code === code);
        return {
          code,
          count,
          hex: color.hex
        };
      });

    this.state.usedColors = usedColors;

    const boardInfo = this.buildBoardInfo(gridSize.width, gridSize.height);
    const scaleNote = gridSize.wasDownscaled
      ? `已从原图 ${sourceWidth} × ${sourceHeight} 缩小到 ${gridSize.width} × ${gridSize.height} 格`
      : `保留原图像素尺寸 ${gridSize.width} × ${gridSize.height} 格`;
    const denoiseNote = denoised.changes
      ? `已清理 ${denoised.changes} 处孤立杂色`
      : "未检测到明显杂色";

    this.setData({
      usedColors,
      boardSummary: boardInfo.boardSummary,
      boardOptions: boardInfo.boardOptions,
      gridMeta: `${gridSize.width} × ${gridSize.height} 格，共 ${gridSize.width * gridSize.height} 颗拼豆，已映射到 MARD 官方色号`,
      renderInfo: `${gridSize.width} × ${gridSize.height} 格 · 预览 ${this.state.cellSize}px/格`,
      statusText: `拼豆图已生成，${scaleNote}，${denoiseNote}。`,
      previewCanvasStyle: `width: ${gridSize.width * this.state.cellSize}px; height: ${gridSize.height * this.state.cellSize}px;`,
      canExport: true
    });
  },

  drawPreviewCanvas() {
    const width = this.state.gridWidth;
    const height = this.state.gridHeight;
    const cellSize = this.state.cellSize;
    const dpr = this.state.dpr;
    const displayWidth = width * cellSize;
    const displayHeight = height * cellSize;

    this.state.previewCanvas.width = displayWidth * dpr;
    this.state.previewCanvas.height = displayHeight * dpr;
    this.state.previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.state.previewCtx.clearRect(0, 0, displayWidth, displayHeight);
    this.state.previewCtx.imageSmoothingEnabled = false;

    this.state.quantizedPixels.forEach((color, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const left = x * cellSize;
      const top = y * cellSize;

      this.state.previewCtx.fillStyle = color.hex;
      this.state.previewCtx.fillRect(left, top, cellSize, cellSize);

      if (this.data.showGrid) {
        this.state.previewCtx.strokeStyle = "rgba(61, 36, 24, 0.2)";
        this.state.previewCtx.lineWidth = 1;
        this.state.previewCtx.strokeRect(left, top, cellSize, cellSize);
      }
    });
  },

  async handleExport() {
    if (!this.data.canExport || !this.state.exportCanvas) {
      return;
    }

    const entries = this.state.usedColors;
    const exportCellSize = 20;
    const padding = 28;
    const titleHeight = 84;
    const patternWidth = this.state.gridWidth * exportCellSize;
    const patternHeight = this.state.gridHeight * exportCellSize;
    const legendWidth = Math.max(patternWidth, 820);
    const columns = Math.max(1, Math.floor(legendWidth / 190));
    const legendHeight = Math.ceil(entries.length / columns) * 28;
    const canvasWidth = patternWidth + padding * 2;
    const canvasHeight = titleHeight + patternHeight + 88 + legendHeight + padding * 2;

    this.state.exportCanvas.width = canvasWidth;
    this.state.exportCanvas.height = canvasHeight;
    this.state.exportCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.state.exportCtx.fillStyle = "#fffaf6";
    this.state.exportCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.state.exportCtx.fillStyle = "#1f2937";
    this.state.exportCtx.font = "700 28px sans-serif";
    this.state.exportCtx.fillText("MARD 拼豆图图例", padding, 42);
    this.state.exportCtx.fillStyle = "#66758a";
    this.state.exportCtx.font = "14px sans-serif";
    this.state.exportCtx.fillText(
      `${this.state.gridWidth} × ${this.state.gridHeight} 格 · ${this.state.gridWidth * this.state.gridHeight} 颗`,
      padding,
      66
    );

    this.state.quantizedPixels.forEach((color, index) => {
      const x = index % this.state.gridWidth;
      const y = Math.floor(index / this.state.gridWidth);
      const left = padding + x * exportCellSize;
      const top = titleHeight + y * exportCellSize;

      this.state.exportCtx.fillStyle = color.hex;
      this.state.exportCtx.fillRect(left, top, exportCellSize, exportCellSize);

      if (this.data.showGrid) {
        this.state.exportCtx.strokeStyle = "rgba(61, 36, 24, 0.28)";
        this.state.exportCtx.lineWidth = 1;
        this.state.exportCtx.strokeRect(left, top, exportCellSize, exportCellSize);
      }
    });

    const legendTop = titleHeight + patternHeight + 36;
    this.state.exportCtx.fillStyle = "#1f2937";
    this.state.exportCtx.font = "700 18px sans-serif";
    this.state.exportCtx.fillText("MARD 色号图例", padding, legendTop);

    entries.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + col * Math.floor(legendWidth / columns);
      const y = legendTop + 18 + row * 28;

      this.state.exportCtx.fillStyle = item.hex;
      this.state.exportCtx.fillRect(x, y + 5, 16, 16);
      this.state.exportCtx.strokeStyle = "rgba(0,0,0,0.12)";
      this.state.exportCtx.strokeRect(x, y + 5, 16, 16);
      this.state.exportCtx.fillStyle = "#1f2937";
      this.state.exportCtx.font = "600 12px sans-serif";
      this.state.exportCtx.fillText(`MARD ${item.code}`, x + 24, y + 10);
      this.state.exportCtx.fillStyle = "#66758a";
      this.state.exportCtx.font = "12px sans-serif";
      this.state.exportCtx.fillText(`${item.hex} · ${item.count} 颗`, x + 24, y + 24);
    });

    try {
      const tempFile = await canvasToTempFilePath(this.state.exportCanvas);
      wx.previewImage({
        urls: [tempFile.tempFilePath],
        current: tempFile.tempFilePath
      });
    } catch (error) {
      wx.showToast({
        title: "导出失败",
        icon: "none"
      });
    }
  }
});
