import * as PIXI from 'pixi.js';
import { nextUniqueId } from '@/History/idGenerator';
export class Renderer {
  constructor(stage) {
    this.stage = stage;
    this.objects = [];

    // 选择回调：由外部（Store）注入，用于对象被点击时通知选中
    this.onSelect = null;
    this.onMinimapClick = null;
    this.miniMap = null;
    this.miniMapContent = null; // 新增：小地图内容容器引用
    this.mainViewport = { x: 0, y: 0, width: 800, height: 600 };
  }

  initMiniMap(miniMapStage, miniMapWidth = 200, miniMapHeight = 150, miniMapScale = 0.1) {
    this.miniMap = new PIXI.Container();
    this.miniMap.width = miniMapWidth;
    this.miniMap.height = miniMapHeight;
    this.miniMap.x = 0; // 改为相对定位，由组件样式控制
    this.miniMap.y = 0;

    // 小地图背景
    const miniMapBg = new PIXI.Graphics();
    miniMapBg.rect(0, 0, miniMapWidth, miniMapHeight);
    miniMapBg.fill(0x000000, 0.7);
    miniMapBg.stroke({ width: 2, color: 0xffffff });
    this.miniMap.addChild(miniMapBg);

    // 小地图内容容器
    this.miniMapContent = new PIXI.Container();
    this.miniMap.addChild(this.miniMapContent);

    // 视口框
    this.miniMapViewport = new PIXI.Graphics();
    this.miniMap.addChild(this.miniMapViewport);

    // 点击事件
    this.miniMap.eventMode = 'static';
    this.miniMap.cursor = 'pointer';
    this.miniMap.on('pointerdown', (e) => {
      this.handleMiniMapClick(e, miniMapWidth, miniMapHeight);
    });

    miniMapStage.addChild(this.miniMap);
    // 使用传入的缩放比例（来自canvasStore）
    this.miniMapScale = miniMapScale;
  }

  setCanvasStore(canvasStore) {
    this.canvasStore = canvasStore;
    // 初始化objects同步
    if (canvasStore && !canvasStore.objects) {
      canvasStore.objects = [...this.objects];
    }
  }

  // // 渲染矩形
  // renderRect(x, y, width, height, options = {}) {
  //   const g = this.createRect(width, height, options)
  //   return this.addToStage(g, x, y)
  // }

  // // 渲染圆形
  // renderCircle(x, y, radius, options = {}) {
  //   const g = this.createCircle(radius, options)
  //   return this.addToStage(g, x, y)
  // }

  // // 渲染三角形
  // renderTriangle(x, y, size, options = {}) {
  //   const g = this.createTriangle(size, options)
  //   return this.addToStage(g, x, y)
  // }

  // 渲染图片
  renderImage(x, y, imageUrl, options = {}) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const texture = PIXI.Texture.from(img)
          const sprite = new PIXI.Sprite(texture)
          sprite.imageUrl = imageUrl
          sprite.rawFilters = options.filters || 'none'
          if (options.filters) {
            const f = this.applyFilters(options.filters)
            if (f && f.length) {
              sprite.filters = f
            } else if (typeof options.filters === 'string') {
              if (options.filters === 'warm') sprite.tint = 0xffcc99
              else if (options.filters === 'cool') sprite.tint = 0x99ccff
              else if (options.filters === 'green') sprite.tint = 0x66ff66
            }
          }
          const scaleOption = options.scale;
          
          if (typeof scaleOption === 'object' && scaleOption !== null) {
              if (typeof scaleOption.x === 'number' && typeof scaleOption.y === 'number') {
                  try { 
                      
                      sprite.scale.set(scaleOption.x, scaleOption.y) 
                  } catch { }
              }
          } 
          
          else if (typeof scaleOption === 'number' && scaleOption > 0) {
              try { 
                  
                  sprite.scale.set(scaleOption) 
              } catch { }
          }
          sprite.anchor.set(0.5)
          const result = this.addToStage(sprite, x, y)
          resolve(result)
        } catch (error) {
          console.error('图片渲染失败:', error)
          resolve(null)
        }
      }
      img.onerror = () => {
        console.error('图片加载失败')
        resolve(null)
      }
      img.src = imageUrl
    })
  }

  // 渲染富文本
  renderText(x, y, text, options = {}) {
    const textObj = this.createText(text, options)
    return this.addToStage(textObj, x, y)
  }

  // 应用滤镜
  applyFilters(mode) {
    const filters = []
    try {
      const CM = PIXI?.Filter?.ColorMatrixFilter
      if (CM) {
        const cm = new CM()
        if (mode === 'green') cm.tint(0x00ff00)
        else if (mode === 'warm') cm.sepia(true)
        else if (mode === 'cool') cm.hue(-30, true)
        if (mode !== 'none') filters.push(cm)
      }
    } catch { }
    return filters
  }

  // 清除所有渲染的对象
  clear() {
    this.objects.forEach(obj => {
      this.stage.removeChild(obj);
      obj.destroy();
    });
    this.objects = [];
    if (this.canvasStore && this.canvasStore.objects) {
      this.canvasStore.objects = [];
    }

    if (this.miniMapContent) {
      this.miniMapContent.removeChildren();
    }
  }

  // 创建矩形图形对象
  createRect(width, height, options = {}) {
    const g = new PIXI.Graphics()
    const fillStyle = options.background ? this.hexToRgb(options.background) : null
    const strokeStyle = (options['border-width'] && options['border-color']) ? {
      width: options['border-width'],
      color: this.hexToRgb(options['border-color'])
    } : null
    g.rect(-width / 2, -height / 2, width, height)
    if (fillStyle !== null) g.fill(fillStyle)
    if (strokeStyle) g.stroke(strokeStyle)
    // 记录几何与样式，便于后续更新
    g._shape = { type: 'rect', width, height }
    g._style = { background: options.background || null, 
                 borderWidth: options['border-width'] || 0, 
                 borderColor: options['border-color'] || null }
    return g
  }

  // 创建圆形图形对象
  createCircle(radius, options = {}) {
    const g = new PIXI.Graphics()
    const fillStyle = options.background ? this.hexToRgb(options.background) : null
    const strokeStyle = (options['border-width'] && options['border-color']) ? {
      width: options['border-width'],
      color: this.hexToRgb(options['border-color'])
    } : null
    g.circle(0, 0, radius)
    if (fillStyle !== null) g.fill(fillStyle)
    if (strokeStyle) g.stroke(strokeStyle)
    // 记录几何与样式，便于后续更新
    g._shape = { type: 'circle', radius }
    g._style = { background: options.background || null, 
                 borderWidth: options['border-width'] || 0, 
                 borderColor: options['border-color'] || null }
    return g
  }

  // 创建三角形图形对象
  createTriangle(size, options = {}) {
    const g = new PIXI.Graphics()
    const fillStyle = options.background ? this.hexToRgb(options.background) : null
    const strokeStyle = (options['border-width'] && options['border-color']) ? {
      width: options['border-width'],
      color: this.hexToRgb(options['border-color'])
    } : null
    g.moveTo(0, -size / 2)
    g.lineTo(size / 2, size / 2)
    g.lineTo(-size / 2, size / 2)
    g.closePath()
    if (fillStyle !== null) g.fill(fillStyle)
    if (strokeStyle) g.stroke(strokeStyle)
    // 记录几何与样式，便于后续更新
    g._shape = { type: 'triangle', size }
    g._style = { background: options.background || null, 
                 borderWidth: options['border-width'] || 0, 
                 borderColor: options['border-color'] || null }
    return g
  }

  // 创建文本对象
  createText(text, options = {}) {
    const style = new PIXI.TextStyle({
      fontFamily: options['font-family'] || 'Arial',
      fontSize: options['font-size'] || 24,
      fill: options.color || '#ffffff',
      backgroundColor: options.background || null,
      fontWeight: options.bold ? 'bold' : 'normal',
      fontStyle: options.italic ? 'italic' : 'normal',
      underline: options.underline || false,
      lineThrough: options.lineThrough || false
    })
    const textObj = new PIXI.Text({ text, style })
    textObj.anchor.set(0.5)
    // 标记对象类型，便于选中后识别
    textObj._shape = { type: 'text' }
    return textObj
  }

  // 创建精灵对象：用于渲染图片
  createSprite(imageUrl, options = {}) {
    console.log('Renderer.createSprite', { imageUrlLength: imageUrl?.length, options })
    const texture = PIXI.Texture.from(imageUrl)
    const sprite = new PIXI.Sprite(texture)
    if (options.filters) {
      const f = this.applyFilters(options.filters)
      if (f && f.length) {
        sprite.filters = f
      } else if (typeof options.filters === 'string') {
        if (options.filters === 'warm') sprite.tint = 0xffcc99
        else if (options.filters === 'cool') sprite.tint = 0x99ccff
        else if (options.filters === 'green') sprite.tint = 0x66ff66
      }
    }
    if (typeof options.scale === 'number' && options.scale > 0) {
      try { sprite.scale.set(options.scale) } catch { }
    }
    sprite.anchor.set(0.5)
    return sprite
  }

  // 异步创建精灵对象：支持图片加载和自动缩放处理
  createSpriteAsync(imageUrl, options = {}) {
    return new Promise(resolve => {
      try {
        const img = new Image()
        img.onload = () => {
          const limit = 4096
          const w = img.naturalWidth || img.width
          const h = img.naturalHeight || img.height
          const maxSide = Math.max(w, h)
          if (maxSide > limit) {
            const scale = limit / maxSide
            const cw = Math.round(w * scale)
            const ch = Math.round(h * scale)
            const canvas = document.createElement('canvas')
            canvas.width = cw
            canvas.height = ch
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, cw, ch)
            const scaledUrl = canvas.toDataURL()
            const sprite = this.createSprite(scaledUrl, options)
            resolve(sprite)
          } else {
            const sprite = this.createSprite(imageUrl, options)
            resolve(sprite)
          }
        }
        img.onerror = () => resolve(null)
        img.src = imageUrl
      } catch {
        try {
          const sprite = this.createSprite(imageUrl, options)
          resolve(sprite)
        } catch {
          resolve(null)
        }
      }
    })
  }

  // 将图形对象添加到舞台并设置位置
  addToStage(display, x, y) {
    console.log('Renderer.addToStage', { x, y, type: display?.constructor?.name })
    display.position.set(x, y)
    display.id = nextUniqueId()
    this.stage.addChild(display)
    this.objects.push(display)
    console.log(`x: ${x}, y: ${y}`)
    if (this.canvasStore && this.canvasStore.objects) {
      this.canvasStore.objects.push(display);
    }
    // 选择支持：绑定指针事件，点击通知外部选中
    try {
      display.eventMode = 'static'
      display.cursor = 'pointer'
      display.on('pointerdown', () => {
        if (typeof this.onSelect === 'function') {
          this.onSelect(display)
        }
      })
    } catch { }
    return display
  }

  // 辅助方法：将十六进制颜色转换为RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      parseInt(result[1], 16) << 16 | parseInt(result[2], 16) << 8 | parseInt(result[3], 16) :
      0xffffff;
  }


  // Renderer.js (替换 eraseAt 方法)
// ----------------------------------------------------------------
// ⚠️ 关键：此方法只移除对象，不销毁，销毁责任交给 HistoryStore 的 redo 逻辑。
    eraseAt(x, y, radius) {
      // 1. 确保 this.objects 是一个数组
      if (!Array.isArray(this.objects)) {
        this.objects = []; 
        return []; 
      }

      const p = new PIXI.Point(x, y);
      // 将局部坐标转换为 Pixi 全局坐标
      const gp = this.stage.toGlobal(p);
      const removed = [];
      
      // 从后向前遍历，安全移除
      for (let i = this.objects.length - 1; i >= 0; i--) {
        const obj = this.objects[i];
        
        // 2. 🚨 对象安全检查：跳过 null/undefined/已销毁的对象
        if (!obj || obj.destroyed || typeof obj.x !== 'number') {
          this.objects.splice(i, 1); // 移除坏引用
          continue;
        }

        try {
          // 获取对象的全局边界 
          const b = obj.getBounds(); 
          
          // 碰撞检测核心变量
          const cx = gp.x;
          const cy = gp.y;
          
          // 找出边界矩形上离圆心最近的点 (rx, ry)
          const rx = Math.max(b.x, Math.min(cx, b.x + b.width));
          const ry = Math.max(b.y, Math.min(cy, b.y + b.height));
          
          // 3. 修复 ReferenceError: dx/dy is not defined
          const dx = cx - rx; 
          const dy = cy - ry; 
          
          // 碰撞检测：如果距离平方小于半径平方
          if (dx * dx + dy * dy <= radius * radius) {
            this.stage.removeChild(obj);
            // obj.destroy?.() // ❌ 必须移除此行！销毁会导致 null 引用崩溃
            removed.push(obj);
            this.objects.splice(i, 1); // 立即从 Renderer 内部数组中移除
          }
        } catch (e) {
          console.error('Renderer.eraseAt: 碰撞检测失败', e);
          this.objects.splice(i, 1);
          continue;
        }
      }

      if (removed.length) {
        // 4. 通知 canvasStore 立即移除这些对象
        if (this.canvasStore && Array.isArray(this.canvasStore.objects)) {
          this.canvasStore.objects = this.canvasStore.objects.filter(o => !removed.includes(o));
        }
      }
      
      return removed; // 返回被移除的对象数组
    }
  
  

  // 更新已有形状样式或几何：统一入口，形状与文本均可
  updateShape(display, props = {}) {
    if (!display || !display._shape) return
    const shape = display._shape
    const style = display._style || {}
    const next = {
      background: props.background ?? style.background ?? null,
      borderWidth: props['border-width'] ?? style.borderWidth ?? 0,
      borderColor: props['border-color'] ?? style.borderColor ?? null,
    }
    // 更新几何尺寸
    if (shape.type === 'rect') {
      const width = props.width ?? shape.width
      const height = props.height ?? shape.height
      display.clear()
      const fillStyle = next.background ? this.hexToRgb(next.background) : null
      const strokeStyle = (next.borderWidth && next.borderColor) ? {
        width: next.borderWidth,
        color: this.hexToRgb(next.borderColor)
      } : null
      display.rect(-width / 2, -height / 2, width, height)
      if (fillStyle !== null) display.fill(fillStyle)
      if (strokeStyle) display.stroke(strokeStyle)
      display._shape.width = width
      display._shape.height = height
    } else if (shape.type === 'circle') {
      const radius = props.radius ?? shape.radius
      display.clear()
      const fillStyle = next.background ? this.hexToRgb(next.background) : null
      const strokeStyle = (next.borderWidth && next.borderColor) ? {
        width: next.borderWidth,
        color: this.hexToRgb(next.borderColor)
      } : null
      display.circle(0, 0, radius)
      if (fillStyle !== null) display.fill(fillStyle)
      if (strokeStyle) display.stroke(strokeStyle)
      display._shape.radius = radius
    } else if (shape.type === 'triangle') {
      const size = props.size ?? shape.size
      display.clear()
      const fillStyle = next.background ? this.hexToRgb(next.background) : null
      const strokeStyle = (next.borderWidth && next.borderColor) ? {
        width: next.borderWidth,
        color: this.hexToRgb(next.borderColor)
      } : null
      display.moveTo(0, -size / 2)
      display.lineTo(size / 2, size / 2)
      display.lineTo(-size / 2, size / 2)
      display.closePath()
      if (fillStyle !== null) display.fill(fillStyle)
      if (strokeStyle) display.stroke(strokeStyle)
      display._shape.size = size
    } else if (shape.type === 'text') {
      // 文本更新：支持样式与内容
      if (typeof props.text === 'string') {
        display.text = props.text
      }
      const s = display.style
      if (props['font-family']) s.fontFamily = props['font-family']
      if (props['font-size']) s.fontSize = props['font-size']
      if (props.color) s.fill = props.color
      if (props.background !== undefined) s.backgroundColor = props.background
      if (props.bold !== undefined) s.fontWeight = props.bold ? 'bold' : 'normal'
      if (props.italic !== undefined) s.fontStyle = props.italic ? 'italic' : 'normal'
      if (props.underline !== undefined) s.underline = !!props.underline
      if (props.lineThrough !== undefined) s.lineThrough = !!props.lineThrough
    }
    display._style = next
    if (props.opacity !== undefined) display.alpha = props.opacity
  }

  getWorldBounds() {
    if (this.objects.length === 0) {
      // 如果没有内容，返回一个以 (0,0) 为中心的默认小区域，防止除以零
      return { minX: -100, minY: -100, maxX: 100, maxY: 100, width: 200, height: 200 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of this.objects) {
      try {
        // 获取对象相对于舞台（即世界坐标）的边界
        const bounds = obj.getBounds(false);

        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      } catch (e) {
        console.error("Error getting bounds for object:", e);
      }
    }

    // 如果计算结果不合理（比如只有 Infinity），使用默认值
    if (minX === Infinity) {
      return { minX: -100, minY: -100, maxX: 100, maxY: 100, width: 200, height: 200 };
    }

    // 添加一个小的缓冲区域，使边界更美观
    const buffer = 50;
    minX -= buffer;
    minY -= buffer;
    maxX += buffer;
    maxY += buffer;

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

}
