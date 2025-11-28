import * as PIXI from 'pixi.js';

export class Renderer {
  constructor(stage) {
    this.stage = stage;
    this.objects = [];
  }

  // 渲染矩形
  renderRect(x, y, width, height, options = {}) {
    const g = this.createRect(width, height, options)
    return this.addToStage(g, x, y)
  }

  // 渲染圆形
  renderCircle(x, y, radius, options = {}) {
    const g = this.createCircle(radius, options)
    return this.addToStage(g, x, y)
  }

  // 渲染三角形
  renderTriangle(x, y, size, options = {}) {
    const g = this.createTriangle(size, options)
    return this.addToStage(g, x, y)
  }

  // 渲染图片
  renderImage(x, y, imageUrl, options = {}) {
    const sprite = this.createSprite(imageUrl, options)
    return this.addToStage(sprite, x, y)
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
    return g
  }

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
    return g
  }

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
    return g
  }

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
    return textObj
  }

  createSprite(imageUrl, options = {}) {
    const texture = PIXI.Texture.from(imageUrl)
    const sprite = new PIXI.Sprite(texture)
    if (options.filters) {
      sprite.filters = this.applyFilters(options.filters)
    }
    sprite.anchor.set(0.5)
    return sprite
  }

  addToStage(display, x, y) {
    display.position.set(x, y)
    this.stage.addChild(display)
    this.objects.push(display)
    return display
  }

  // 辅助方法：将十六进制颜色转换为RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
      parseInt(result[1], 16) << 16 | parseInt(result[2], 16) << 8 | parseInt(result[3], 16) :
      0xffffff;
  }
}
