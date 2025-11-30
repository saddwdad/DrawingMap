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
    dragRafId: null,
    lastDragDelta: { dx: 0, dy: 0 },
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
    pendingItem: null,
    pendingType: null,
    pendingImageUrl: null,
    // 选中对象状态：用于参数面板编辑已存在对象
    selectedObject: null,
    selectedType: null,
    // 文本内容：用于文本工具的输入来源
    currentTextContent: ''
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
      if (this.renderer) {
        // 注入选择回调：点击对象即设置选中态
        this.renderer.onSelect = (obj) => {
          this.setSelected(obj)
        }
      }
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
      this.lastDragDelta = { dx: 0, dy: 0 }
    },

    // 拖动视口
    dragViewport(e) {
      if (!this.isDragging) return
      const dx = (e.clientX - this.dragStart.x) / this.viewport.scale
      const dy = (e.clientY - this.dragStart.y) / this.viewport.scale
      this.dragStart = { x: e.clientX, y: e.clientY }
      this.lastDragDelta = { dx, dy }
      if (!this.dragRafId) {
        this.dragRafId = requestAnimationFrame(() => {
          const { dx: rdx, dy: rdy } = this.lastDragDelta
          this.viewport.x -= rdx
          this.viewport.y -= rdy
          this.dragRafId = null
        })
      }
    },

    // 结束拖动
    endDrag() {
      this.isDragging = false
      if (this.dragRafId) {
        cancelAnimationFrame(this.dragRafId)
        this.dragRafId = null
      }
    },

    // 设置当前工具
    setCurrentTool(tool) {
      this.currentTool = tool;
      if (this.pendingItem) {
        try { this.pendingItem.destroy?.() } catch { }
      }
      this.pendingItem = null
      this.pendingType = null
    },

    // 设置当前颜色
    setCurrentColor(color) {
      this.currentColor = color;
      // 实时应用到选中对象
      if (this.selectedObject) {
        if (this.selectedType === 'rect' || this.selectedType === 'circle' || this.selectedType === 'triangle') {
          this.renderer?.updateShape(this.selectedObject, { background: color })
        } else if (this.selectedType === 'text') {
          this.renderer?.updateShape(this.selectedObject, { color })
        }
      }
    },

    // 设置当前大小
    setCurrentSize(size) {
      this.currentSize = size;
      // 形状选中时动态调整几何尺寸
      if (this.selectedObject && (this.selectedType === 'rect' || this.selectedType === 'circle' || this.selectedType === 'triangle')) {
        const props = {}
        if (this.selectedType === 'rect') {
          props.width = size; props.height = size
        } else if (this.selectedType === 'circle') {
          props.radius = Math.max(1, size / 2)
        } else if (this.selectedType === 'triangle') {
          props.size = size
        }
        this.renderer?.updateShape(this.selectedObject, props)
      } else if (this.selectedType === 'text') {
        this.renderer?.updateShape(this.selectedObject, { 'font-size': size })
      }
    },

    // 设置当前边框宽度
    setCurrentBorderWidth(width) {
      this.currentBorderWidth = width;
      // 形状选中时动态调整边框宽度
      if (this.selectedObject && (this.selectedType === 'rect' || this.selectedType === 'circle' || this.selectedType === 'triangle')) {
        this.renderer?.updateShape(this.selectedObject, { 'border-width': width })
      }
    },

    // 设置当前边框颜色
    setCurrentBorderColor(color) {
      this.currentBorderColor = color;
      // 形状选中时动态调整边框颜色
      if (this.selectedObject && (this.selectedType === 'rect' || this.selectedType === 'circle' || this.selectedType === 'triangle')) {
        this.renderer?.updateShape(this.selectedObject, { 'border-color': color })
      }
    },

    // 设置当前透明度
    setCurrentOpacity(opacity) {
      this.currentOpacity = opacity;
      // 选中对象透明度实时生效
      if (this.selectedObject) {
        this.renderer?.updateShape(this.selectedObject, { opacity })
      }
    },

    // 绘制图形
    drawShape(x, y, type) {
      console.log('drawShape调用:');
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
          console.log(`绘制矩形, x:${x}, y:${y}`);
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

    // 准备待绘制图形：创建对应类型的图形对象
    preparePending(type) {
      if (!this.renderer) return
      const options = {
        background: this.currentColor,
        'border-width': this.currentBorderWidth,
        'border-color': this.currentBorderColor
      }
      if (type === 'rect') {
        this.pendingItem = this.renderer.createRect(this.currentSize, this.currentSize, options)
      } else if (type === 'circle') {
        this.pendingItem = this.renderer.createCircle(this.currentSize / 2, options)
      } else if (type === 'triangle') {
        this.pendingItem = this.renderer.createTriangle(this.currentSize, options)
      } else {
        this.pendingItem = null
      }
      this.pendingType = this.pendingItem ? type : null
    },

    preparePendingText(text) {
      if (!this.renderer) return
      const textOptions = {
        'font-family': this.currentFontFamily,
        'font-size': this.currentFontSize,
        color: this.currentTextColor,
        background: this.currentTextBackground,
        bold: this.currentBold,
        italic: this.currentItalic,
        underline: this.currentUnderline,
        lineThrough: this.currentLineThrough
      }
      // 使用参数面板的文本内容作为默认输入
      this.pendingItem = this.renderer.createText(text || this.currentTextContent || '', textOptions)
      this.pendingType = 'pen'
    },

    finalizePending(x, y) {
      if (!this.renderer) return
      if (this.pendingType === 'picture' && this.pendingImageUrl) {
        const filters = this.currentFilters
        const imageUrl = this.pendingImageUrl
        // 先移除预览图片
        if (this.pendingItem) {
          this.renderer.stage.removeChild(this.pendingItem)
          this.pendingItem.destroy()
          this.pendingItem = null
        }
        // 异步渲染图片
        this.renderer.renderImage(x, y, imageUrl, { filters })
        // 清除pending状态
        this.pendingImageUrl = null
        this.pendingType = null
        return
      }
      if (!this.pendingItem) return
      this.renderer.addToStage(this.pendingItem, x, y)
      this.pendingItem = null
      this.pendingType = null
      if (this.currentTool === 'rect' || this.currentTool === 'circle' || this.currentTool === 'triangle') {
        this.preparePending(this.currentTool)
      }
    },

    // 擦除入口：根据当前大小计算笔刷半径并委托渲染器删除命中的对象
    eraseAt(x, y) {
      if (!this.renderer) return
      const radius = Math.max(1, (this.currentSize || 20) / 2)
      this.renderer.eraseAt(x, y, radius)
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
      console.log('renderImage', { x, y, imageUrlLength: imageUrl?.length, filters })
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

    // 屏幕坐标转世界坐标：将鼠标在屏幕上的坐标转换为画布世界坐标
    screenToWorld(mouseX, mouseY) {
      const centerX = this.minimap.viewportSize.width / 2
      const centerY = this.minimap.viewportSize.height / 2
      const worldX = this.viewport.x + (mouseX - centerX) / this.viewport.scale
      const worldY = this.viewport.y + (mouseY - centerY) / this.viewport.scale
      return { x: worldX, y: worldY }
    },

    // 世界坐标转屏幕坐标：将画布世界坐标转换为屏幕坐标
    worldToScreen(worldX, worldY) {
      const centerX = this.minimap.viewportSize.width / 2
      const centerY = this.minimap.viewportSize.height / 2
      const screenX = centerX + (worldX - this.viewport.x) * this.viewport.scale
      const screenY = centerY + (worldY - this.viewport.y) * this.viewport.scale
      return { x: screenX, y: screenY }
    },

    // 设置文本属性
    setTextProperty(property, value) {
      this[`current${property.charAt(0).toUpperCase() + property.slice(1)}`] = value;
      // 文本选中时，参数面板的设置实时应用
      if (this.selectedType === 'text' && this.selectedObject) {
        const props = {}
        if (property === 'fontFamily') props['font-family'] = value
        else if (property === 'fontSize') props['font-size'] = value
        else if (property === 'textColor') props.color = value
        else if (property === 'textBackground') props.background = value
        else if (property === 'bold') props.bold = value
        else if (property === 'italic') props.italic = value
        else if (property === 'underline') props.underline = value
        else if (property === 'lineThrough') props.lineThrough = value
        this.renderer?.updateShape(this.selectedObject, props)
      }
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

    // 选中对象管理
    setSelected(obj) {
      this.selectedObject = obj
      let type = 'unknown'
      try {
        if (obj._shape?.type) type = obj._shape.type
        else if (obj.constructor?.name === 'Text') type = 'text'
      } catch { }
      this.selectedType = type
    },

    clearSelection() {
      this.selectedObject = null
      this.selectedType = null
    },

    setCurrentTextContent(text) {
      this.currentTextContent = text
      // 修改选中文本的内容
      if (this.selectedType === 'text' && this.selectedObject) {
        this.renderer?.updateShape(this.selectedObject, { text })
      }
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
    // 设置画布缩放比例：确保缩放值在限制范围内
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

    // 将视口中心点设置为指定的世界坐标
    centerViewportOn(x, y) {
      this.viewport.x = x
      this.viewport.y = y
    },

    preparePendingImage(imageUrl) {
      if (!this.renderer) return
      this.pendingImageUrl = imageUrl
      this.pendingType = 'picture'
      // 创建临时预览图片
      this.renderer.createSpriteAsync(imageUrl, { filters: this.currentFilters })
        .then(sprite => {
          if (sprite) {
            this.pendingItem = sprite
            // 将预览图片添加到舞台
            this.renderer.stage.addChild(sprite)
          }
        })
    },
  },

  persist: {
    enabled: true,
    paths: ['viewport']
  }
})
