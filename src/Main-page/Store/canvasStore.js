// src/stores/canvasStore.js
import { defineStore } from 'pinia'
import { useHistoryStore } from '@/History/History';

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
    objects: [],
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
    currentImageUrl: null,
    currentImageScale: 1,
    currentImageFilter: 'none',
    pendingItem: null,
    pendingType: null,
    pendingImageUrl: null,
    // 选中对象状态：用于参数面板编辑已存在对象
    selectedObject: null,
    selectedType: null,
    // 文本内容：用于文本工具的输入来源
    currentTextContent: '',
    //跟踪绘制对象
    objects: [],
  }),
  getters: {

    // canvasStore.js 的 worldBounds 计算属性（修改关键部分）
    worldBounds: (state) => {
        // 🔴 第 0 层防护：直接捕获所有异常，避免组件崩溃
        try {
          const renderer = state.renderer;
          
          // 第 1 层防护：所有核心依赖的严格校验（包括是否为对象）
          if (!renderer || typeof renderer !== 'object' ||
              !state.viewport || typeof state.viewport !== 'object' ||
              !state.minimap || typeof state.minimap !== 'object' ||
              state.viewport.x === undefined || state.viewport.y === undefined) {
            return { minX: 0, maxX: 800, minY: 0, maxY: 600, width: 800, height: 600 };
          }

          // 第 2 层防护：viewport 完全兜底（强制转为有效数字）
          const viewport = {
            x: typeof state.viewport.x === 'number' && !isNaN(state.viewport.x) ? state.viewport.x : 0,
            y: typeof state.viewport.y === 'number' && !isNaN(state.viewport.y) ? state.viewport.y : 0,
            scale: typeof state.viewport.scale === 'number' && !isNaN(state.viewport.scale) && state.viewport.scale > 0 ? state.viewport.scale : 1
          };
          const minimap = state.minimap;
          const viewportScale = viewport.scale;
          const viewportSize = (typeof minimap.viewportSize === 'object' && minimap.viewportSize);
          const viewportW = viewportSize.width / viewportScale;
          const viewportH = viewportSize.height / viewportScale;

          // 🔴 第 3 层防护：renderer.objects 完全兜底（确保是数组，再过滤）
          const objects = Array.isArray(renderer.objects) ? renderer.objects : [];
          // 最严格的有效对象过滤：排除所有非对象/无效属性
          const validObjects = objects.filter(obj => {
            return obj !== null && obj !== undefined && // 非空
                  typeof obj === 'object' && obj.constructor !== undefined && // 是有效对象
                  typeof obj.x === 'number' && !isNaN(obj.x) && // x 是有效数字
                  typeof obj.y === 'number' && !isNaN(obj.y); // y 是有效数字
          });

          // 无有效对象时的边界
          if (validObjects.length === 0) {
            return {
              minX: viewport.x - viewportW,
              maxX: viewport.x + viewportW,
              minY: viewport.y - viewportH,
              maxY: viewport.y + viewportH,
              width: viewportW * 2,
              height: viewportH * 2
            };
          }

          // 🔴 第 4 层防护：遍历前初始化默认边界，遍历中再添对象级兜底
          let minX = viewport.x - viewportW / 2;
          let maxX = viewport.x + viewportW / 2;
          let minY = viewport.y - viewportH / 2;
          let maxY = viewport.y + viewportH / 2;

          validObjects.forEach(obj => {
            // 双重保险：再次校验 obj（避免极端情况）
            if (!obj || typeof obj !== 'object' || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
              return;
            }

            const shape = typeof obj._shape === 'object' ? obj._shape : {};
            const objX = obj.x;
            const objY = obj.y;
            let objMinX, objMaxX, objMinY, objMaxY;

            const shapeType = shape.type || obj.constructor?.name || 'default';

            // 每种形状的边界计算都添默认值
            switch (shapeType) {
              case 'rect':
                const rectW = typeof shape.width === 'number' && shape.width > 0 ? shape.width : 100;
                const rectH = typeof shape.height === 'number' && shape.height > 0 ? shape.height : 100;
                objMinX = objX - rectW / 2;
                objMaxX = objX + rectW / 2;
                objMinY = objY - rectH / 2;
                objMaxY = objY + rectH / 2;
                break;
              case 'circle':
                const radius = typeof shape.radius === 'number' && shape.radius > 0 ? shape.radius : 50;
                objMinX = objX - radius;
                objMaxX = objX + radius;
                objMinY = objY - radius;
                objMaxY = objY + radius;
                break;
              case 'triangle':
                const size = typeof shape.size === 'number' && shape.size > 0 ? shape.size : 100;
                objMinX = objX - size / 2;
                objMaxX = objX + size / 2;
                objMinY = objY - size / 2;
                objMaxY = objY + size / 2;
                break;
              case 'text':
              case 'Sprite':
              default:
                objMinX = objX - 20;
                objMaxX = objX + 20;
                objMinY = objY - 20;
                objMaxY = objY + 20;
                break;
            }

            // 确保边界值有效
            objMinX = typeof objMinX === 'number' && !isNaN(objMinX) ? objMinX : objX - 50;
            objMaxX = typeof objMaxX === 'number' && !isNaN(objMaxX) ? objMaxX : objX + 50;
            objMinY = typeof objMinY === 'number' && !isNaN(objMinY) ? objMinY : objY - 50;
            objMaxY = typeof objMaxY === 'number' && !isNaN(objMaxY) ? objMaxY : objY + 50;

            // 更新全局边界
            minX = Math.min(minX, objMinX);
            maxX = Math.max(maxX, objMaxX);
            minY = Math.min(minY, objMinY);
            maxY = Math.max(maxY, objMaxY);
          });

          // 扩展边界
          const paddingX = (maxX - minX) * 0.2;
          const paddingY = (maxY - minY) * 0.2;
          minX -= paddingX;
          maxX += paddingX;
          minY -= paddingY;
          maxY += paddingY;

          return {
            minX, maxX, minY, maxY,
            width: maxX - minX,
            height: maxY - minY
          };
        } catch (err) {
          // 🔴 终极兜底：任何异常都返回默认边界，避免组件崩溃
          console.warn('worldBounds 计算异常，返回默认边界：', err);
          return { minX: 0, maxX: 800, minY: 0, maxY: 600, width: 800, height: 600 };
        }
},

    viewportTransform(state) {
      return {
        x: state.viewport.x,
        y: state.viewport.y,
        scale: state.viewport.scale
      }
    },

    scalePercent: (state) => `${Math.round(state.viewport.scale * 100)}%`,
  },
  actions: {
    // 设置渲染器
    
    centerViewportOnWorldCoords(worldX, worldY) {
      this.viewport.x = worldX
      this.viewport.y = worldY
    },


    setRenderer(renderer) {
      this.renderer = renderer;
      if (this.renderer) {
        // 注入选择回调：点击对象即设置选中态
        this.renderer.onSelect = (obj) => {
          this.setSelected(obj)
        }
        this.renderer.setCanvasStore(this);
      }
    },




    // 初始化视口大小
    initViewportSize(width, height) {
      this.minimap.viewportSize = { width, height }
    },
    //更新位置
    updateViewportPosition(centerX, centerY) {
      this.centerViewportOn(centerX, centerY);
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

    preparePendingImage(imageUrl) {
      if (!this.renderer) return
      this.pendingImageUrl = imageUrl
      this.pendingType = 'picture'
      // // 创建临时预览图片
      // this.renderer.createSpriteAsync(imageUrl, { filters: this.currentFilters })
      //   .then(sprite => {
      //     if (sprite) {
      //       this.pendingItem = sprite
      //       // 将预览图片添加到舞台
      //       this.renderer.stage.addChild(sprite)
      //     }
      //   })
    },

    finalizePending(x, y) {
        const historyStore = useHistoryStore()
        if (!this.renderer) return console.log("无渲染器")
        if (!Array.isArray(this.objects)) this.objects = []

        // 图片场景（修复 redo 逻辑）
        if (this.pendingType === 'picture' && this.pendingImageUrl) {
          const filters = this.currentFilters
          const imageUrl = this.pendingImageUrl
          console.log("final渲染照片")
          const imageItem = this.renderer.renderImage(x, y, imageUrl, { filters })
          if(!imageItem) return 
          
          // 保存 canvasStore 的 this 和必要参数（闭包传递）
          const canvasThis = this;
          const renderX = x;
          const renderY = y;
          const imgFilters = filters;

          historyStore.recordAction({
              type: 'add_picture',
              undo: () => {
                const target = canvasThis.objects.find(obj => obj === imageItem)
                if (target) {
                  if (target.parent) target.parent.removeChild(target)
                  target.destroy({ children: true })
                }
                canvasThis.objects = canvasThis.objects.filter(obj => obj !== imageItem && obj !== null && obj !== undefined)
                canvasThis.clearSelection()
                canvasThis.renderer.render && canvasThis.renderer.render()
              },
              redo: () => {
                // 用闭包保存的参数，避免 this 指向问题
                const newImage = canvasThis.renderer.renderImage(renderX, renderY, imageUrl, { filters: imgFilters })
                if (newImage && newImage.x !== undefined && newImage.y !== undefined) {
                  canvasThis.renderer.addToStage(newImage, renderX, renderY)
                  canvasThis.objects.push(newImage)
                  canvasThis.renderer.render && canvasThis.renderer.render()
                }
              }
            })
          
          this.pendingImageUrl = null
          this.pendingType = null
          if (imageItem) this.objects.push(imageItem)
          return
        }

        // 形状场景（修复 redo 逻辑）
        if (!this.pendingItem) return console.log("无预渲染")
        let shapeItem = this.pendingItem
        shapeItem = this.renderer.addToStage(shapeItem, x, y)
        console.log("对象是否在舞台中：", shapeItem.parent === this.renderer.stage)
        
        // 保存 canvasStore 的 this 和必要参数（闭包传递）
        const canvasThis = this;
        const renderX = x;
        const renderY = y;
        const shapeType = this.pendingType; // 存储当前形状类型

        historyStore.recordAction({
            type: `add_${shapeType}`,
            shapeType: shapeType, // 存入 action（冗余备份）
            undo: () => {
              const target = canvasThis.objects.find(obj => obj === shapeItem)
              if (target) {
                if (target.parent) target.parent.removeChild(target)
                target.destroy({ children: true })
              }
              canvasThis.objects = canvasThis.objects.filter(obj => obj !== shapeItem && obj !== null && obj !== undefined)
              canvasThis.clearSelection()
              canvasThis.renderer.render && canvasThis.renderer.render()
            },
            redo: () => {
              // 用闭包保存的 canvasThis 和 shapeType，避免 this 指向问题
              canvasThis.pendingType = shapeType;
              canvasThis.preparePending(shapeType);
              const newShape = canvasThis.pendingItem;
              
              if (newShape && newShape.x !== undefined && newShape.y !== undefined) {
                canvasThis.renderer.addToStage(newShape, renderX, renderY);
                canvasThis.objects.push(newShape);
                canvasThis.pendingItem = null;
                canvasThis.renderer.render && canvasThis.renderer.render();
              }
            }
        })

        this.pendingItem = null
        this.pendingType = null
        if (shapeItem) this.objects.push(shapeItem)
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
      if (!this.renderer || !this.renderer.stage || !this.renderer.objects) return;

      // 1. 移除舞台上所有子元素（视觉清除）
      this.renderer.stage.removeChildren();

      // 2. 清空 objects 数组（数据清除，关键！）
      // 注意：要重新赋值数组，触发响应式更新（直接 splice 可能不触发）
      this.renderer.objects = [];

      // 3. 清除 pending 状态（避免残留未完成的对象）
      this.pendingItem = null;
      this.pendingType = null;
      this.pendingImageUrl = null;
    },

    // 渲染图片
    renderImage(x, y, imageUrl, options = {}) {
      if (!this.renderer) return;

      // 不需要考虑画布当前的偏移量，因为stage的pivot会处理画布的偏移
      // 直接使用相对于stage中心的坐标绘制图片
      console.log('使用的坐标:', { x, y });

      const filterMode = options.filters || this.currentImageFilter || 'none'
      const scale = options.scale ?? this.currentImageScale ?? 1
      console.log('renderImage', { x, y, imageUrlLength: imageUrl?.length, filterMode, scale })
      return this.renderer.renderImage(x, y, imageUrl, { filters: filterMode, scale });
    },

    // 设置滤镜
    setFilter(filterName, value) {
      this.currentFilters[filterName] = value;
    },

    setCurrentImageUrl(url) {
      this.currentImageUrl = url
    },

    setCurrentImageScale(scale) {
      this.currentImageScale = Math.max(0.1, Math.min(10, Number(scale) || 1))
      if (this.selectedType === 'Sprite' && this.selectedObject) {
        try { this.selectedObject.scale.set(this.currentImageScale) } catch { }
      }
    },

    setCurrentImageFilter(mode) {
      this.currentImageFilter = mode || 'none'
      if (this.selectedType === 'Sprite' && this.selectedObject) {
        try {
          const f = this.renderer?.applyFilters(this.currentImageFilter)
          if (f && f.length) {
            this.selectedObject.filters = f
          } else {
            if (this.currentImageFilter === 'warm') this.selectedObject.tint = 0xffcc99
            else if (this.currentImageFilter === 'cool') this.selectedObject.tint = 0x99ccff
            else if (this.currentImageFilter === 'green') this.selectedObject.tint = 0x66ff66
            else this.selectedObject.tint = 0xffffff
          }
        } catch { }
      }
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
  },

  persist: {
    enabled: true,
    paths: ['viewport']
  }
})
