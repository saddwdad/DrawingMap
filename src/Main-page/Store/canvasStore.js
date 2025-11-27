// src/stores/canvasStore.js
import { defineStore } from 'pinia'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    viewport: {
      x: 0,
      y: 0,
      scale: 1
    },
    isDragging: false, // 是否正在拖动内容
    dragStart: { x: 0, y: 0 },
    bgColor: '#1a1a1a', // 内容背景色
    borderColor: '#333', // 内容边框色
    scalestep: 0.1,
    scaleLimits: { min: 0.1, max: 10 },
    minimap: {
      scale: 0.1,
      viewportSize: { width: 0, height: 0 }
    },
    // 渲染相关状态
    renderer: null,
    currentTool: 'pen',
    currentColor: '#ffffff', // 初始颜色设置为白色
    currentSize: 100,
    currentBorderWidth: 2,
    currentBorderColor: '#333',
    currentOpacity: 1,
    // 文本相关状态
    currentFontFamily: 'Arial',
    currentFontSize: 24,
    currentTextColor: '#ffffff',
    currentTextBackground: null,
    currentBold: false,
    currentItalic: false,
    currentUnderline: false,
    currentLineThrough: false,
    // 图片相关状态
    currentFilters: { grayscale: false, blur: 0, brightness: 1 },
  }),
  getters: {
    viewportTransform(state) {
      return {
        x: state.viewport.x,
        y: state.viewport.y,
        scale: state.viewport.scale
      }
    },

    scalePercent(state) {
      return Math.round(state.viewport.scale * 100) + '%'
    }
  },
  actions: {
    // 设置渲染器
    setRenderer(renderer) {
      this.renderer = renderer;
    },

    // 初始化视口大小
    initViewportSize(width, height) {
      this.minimap.viewportSize = { width, height }
    },

    // 开始拖动
    startDrag(e) {
      // 现在只通过右键拖动，所以不需要检查目标元素
      // 直接设置拖动状态
      this.isDragging = true
      this.dragStart = { x: e.clientX, y: e.clientY }
    },

    // 拖动视口
    dragViewport(e) {
      if (!this.isDragging) return
      const dx = (e.clientX - this.dragStart.x) / this.viewport.scale
      const dy = (e.clientY - this.dragStart.y) / this.viewport.scale
      this.viewport.x -= dx
      this.viewport.y -= dy
      this.dragStart = { x: e.clientX, y: e.clientY }
    },

    // 结束拖动
    endDrag() {
      this.isDragging = false
    },

    // 设置当前工具
    setCurrentTool(tool) {
      this.currentTool = tool;
    },

    // 设置当前颜色
    setCurrentColor(color) {
      this.currentColor = color;
    },

    // 设置当前大小
    setCurrentSize(size) {
      this.currentSize = size;
    },

    // 设置当前边框宽度
    setCurrentBorderWidth(width) {
      this.currentBorderWidth = width;
    },

    // 设置当前边框颜色
    setCurrentBorderColor(color) {
      this.currentBorderColor = color;
    },

    // 设置当前透明度
    setCurrentOpacity(opacity) {
      this.currentOpacity = opacity;
    },

    // 绘制图形
    drawShape(x, y, type) {
      console.log('drawShape调用:', { type, x, y });
      if (!this.renderer) {
        console.log('renderer不存在');
        return;
      }

      // 不需要考虑画布当前的偏移量，因为stage的pivot会处理画布的偏移
      // 直接使用相对于stage中心的坐标绘制图形
      console.log('使用的坐标:', { x, y });

      const options = {
        background: this.currentColor,
        'border-width': this.currentBorderWidth,
        'border-color': this.currentBorderColor
      };
      console.log('绘制选项:', options);

      switch (type) {
        case 'rect':
          console.log('绘制矩形');
          this.renderer.renderRect(x, y, this.currentSize, this.currentSize, options);
          break;
        case 'circle':
          console.log('绘制圆形');
          this.renderer.renderCircle(x, y, this.currentSize / 2, options);
          break;
        case 'triangle':
          console.log('绘制三角形');
          this.renderer.renderTriangle(x, y, this.currentSize, options);
          break;
        default:
          console.log('未知工具类型:', type);
          break;
      }
    },

    // 清除画布
    clearCanvas() {
      if (this.renderer) {
        this.renderer.clear();
      }
    },

    // 渲染图片
    renderImage(x, y, imageUrl, options = {}) {
      if (!this.renderer) return;

      // 不需要考虑画布当前的偏移量，因为stage的pivot会处理画布的偏移
      // 直接使用相对于stage中心的坐标绘制图片
      console.log('使用的坐标:', { x, y });

      const filters = options.filters || this.currentFilters;
      return this.renderer.renderImage(x, y, imageUrl, { filters });
    },

    // 设置滤镜
    setFilter(filterName, value) {
      this.currentFilters[filterName] = value;
    },

    // 重置滤镜
    resetFilters() {
      this.currentFilters = { grayscale: false, blur: 0, brightness: 1 };
    },

    // 渲染文本
    renderText(x, y, text, options = {}) {
      if (!this.renderer) return;

      // 不需要考虑画布当前的偏移量，因为stage的pivot会处理画布的偏移
      // 直接使用相对于stage中心的坐标绘制文本
      console.log('使用的坐标:', { x, y });

      const textOptions = {
        'font-family': options.fontFamily || this.currentFontFamily,
        'font-size': options.fontSize || this.currentFontSize,
        color: options.color || this.currentTextColor,
        background: options.background || this.currentTextBackground,
        bold: options.bold || this.currentBold,
        italic: options.italic || this.currentItalic,
        underline: options.underline || this.currentUnderline,
        lineThrough: options.lineThrough || this.currentLineThrough
      };

      return this.renderer.renderText(x, y, text, textOptions);
    },

    // 设置文本属性
    setTextProperty(property, value) {
      this[`current${property.charAt(0).toUpperCase() + property.slice(1)}`] = value;
    },

    // 重置文本属性
    resetTextProperties() {
      this.currentFontFamily = 'Arial';
      this.currentFontSize = 24;
      this.currentTextColor = '#ffffff';
      this.currentTextBackground = null;
      this.currentBold = false;
      this.currentItalic = false;
      this.currentUnderline = false;
      this.currentLineThrough = false;
    },

    scaleViewport(e, delta) {
      e.preventDefault()
      const newScale = Math.max(
        this.scaleLimits.min,
        Math.min(this.scaleLimits.max, this.viewport.scale + delta)
      )

      if (newScale === this.viewport.scale) return

      const rect = e.target.getBoundingClientRect()
      const mouseX = e.clientX - rect.left // 鼠标在容器内的X坐标
      const mouseY = e.clientY - rect.top // 鼠标在容器内的Y坐标

      // 容器中心点 (Stage的 position 坐标)
      const centerX = this.minimap.viewportSize.width / 2
      const centerY = this.minimap.viewportSize.height / 2

      // 1. 计算鼠标相对于 Stage 中心点的偏移 (屏幕坐标)
      const screenX = mouseX - centerX
      const screenY = mouseY - centerY

      // 2. 将屏幕偏移转换为 Pixi 世界坐标
      const worldX = screenX / this.viewport.scale + this.viewport.x
      const worldY = screenY / this.viewport.scale + this.viewport.y

      // 3. 更新缩放比例
      this.viewport.scale = newScale

      // 4. 应用新的缩放比例，计算新的视口坐标
      // 新的视口 X = 鼠标的世界X - 鼠标的屏幕X / 新缩放
      this.viewport.x = worldX - screenX / newScale
      this.viewport.y = worldY - screenY / newScale


    },
    setScale(newScale) {
      // 确保值在限制范围内
      const scale = Math.max(
        this.scaleLimits.min,
        Math.min(this.scaleLimits.max, newScale)
      )
      this.viewport.scale = scale
    },


    resetCanvas() {
      this.viewport.x = 0
      this.viewport.y = 0
      this.viewport.scale = 1
      this.isDragging = false
    },
  },

  persist: {
    enabled: true,
    paths: ['viewport']
  }
})