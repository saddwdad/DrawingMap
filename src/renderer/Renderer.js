import * as PIXI from 'pixi.js';

export class Renderer {
  constructor(stage) {
    this.stage = stage;
    this.objects = [];
    // 选择回调：由外部（Store）注入，用于对象被点击时通知选中
    this.onSelect = null;
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
    console.log('Renderer.renderImage', { x, y, imageUrlLength: imageUrl?.length, options })
    return this.createSpriteAsync(imageUrl, options).then(sprite => {
      if (!sprite) return null
      return this.addToStage(sprite, x, y)
    })
  }

  // 渲染富文本
  renderText(x, y, text, options = {}) {
    const textObj = this.createText(text, options)
    return this.addToStage(textObj, x, y)
  }

  // 应用滤镜
  applyFilters() {
    const filters = [];
    // 暂时注释掉滤镜功能
    return filters;
  }

  // 清除所有渲染的对象
  clear() {
    this.objects.forEach(obj => {
      this.stage.removeChild(obj);
      obj.destroy();
    });
    this.objects = [];
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
    g._style = { background: options.background || null, borderWidth: options['border-width'] || 0, borderColor: options['border-color'] || null }
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
    g._style = { background: options.background || null, borderWidth: options['border-width'] || 0, borderColor: options['border-color'] || null }
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
    g._style = { background: options.background || null, borderWidth: options['border-width'] || 0, borderColor: options['border-color'] || null }
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
      sprite.filters = this.applyFilters(options.filters)
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
    this.stage.addChild(display)
    this.objects.push(display)
    console.log(`x: ${x}, y: ${y}`)
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
  // 擦除：将局部坐标转换为全局坐标，
  // 使用圆-矩形最近点测试判定命中对象并移除，返回删除数量
  eraseAt(x, y, radius) {
    const p = new PIXI.Point(x, y)
    const gp = this.stage.toGlobal(p)
    const removed = []
    for (let i = 0; i < this.objects.length; i++) {
      const obj = this.objects[i]
      const b = obj.getBounds()
      const cx = gp.x
      const cy = gp.y
      const rx = Math.max(b.x, Math.min(cx, b.x + b.width))
      const ry = Math.max(b.y, Math.min(cy, b.y + b.height))
      const dx = cx - rx
      const dy = cy - ry
      if (dx * dx + dy * dy <= radius * radius) {
        this.stage.removeChild(obj)
        obj.destroy?.()
        removed.push(obj)
      }
    }
    if (removed.length) {
      this.objects = this.objects.filter(o => !removed.includes(o))
    }
    return removed.length
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
}
