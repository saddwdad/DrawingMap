import * as PIXI from 'pixi.js';

export class Renderer {
  constructor(stage) {
    this.stage = stage;
    this.objects = [];
  }

  // 渲染矩形
  renderRect(x, y, width, height, options = {}) {
    console.log('Renderer.renderRect调用:', { x, y, width, height, options });
    const graphics = new PIXI.Graphics();
    
    // 设置背景色
    const hasBackground = !!options.background;
    console.log('hasBackground:', hasBackground);
    if (hasBackground) {
      const bgColor = this.hexToRgb(options.background);
      console.log('背景色:', bgColor);
      graphics.beginFill(bgColor);
    }
    
    // 设置边框
    if (options['border-width'] && options['border-color']) {
      const borderWidth = options['border-width'];
      const borderColor = this.hexToRgb(options['border-color']);
      console.log('边框:', { borderWidth, borderColor });
      graphics.lineStyle(borderWidth, borderColor);
    }
    
    console.log('绘制矩形:', { x: -width/2, y: -height/2, width, height });
    graphics.drawRect(-width/2, -height/2, width, height);
    
    // 只有设置了背景色才调用endFill()
    if (hasBackground) {
      graphics.endFill();
    }
    
    graphics.position.set(x, y);
    console.log('添加到舞台:', { x, y });
    this.stage.addChild(graphics);
    this.objects.push(graphics);
    console.log('渲染完成，当前对象数量:', this.objects.length);
    
    return graphics;
  }

  // 渲染圆形
  renderCircle(x, y, radius, options = {}) {
    const graphics = new PIXI.Graphics();
    
    // 设置背景色
    const hasBackground = !!options.background;
    if (hasBackground) {
      graphics.beginFill(this.hexToRgb(options.background));
    }
    
    // 设置边框
    if (options['border-width'] && options['border-color']) {
      graphics.lineStyle(options['border-width'], this.hexToRgb(options['border-color']));
    }
    
    graphics.drawCircle(0, 0, radius);
    
    // 只有设置了背景色才调用endFill()
    if (hasBackground) {
      graphics.endFill();
    }
    
    graphics.position.set(x, y);
    this.stage.addChild(graphics);
    this.objects.push(graphics);
    
    return graphics;
  }

  // 渲染三角形
  renderTriangle(x, y, size, options = {}) {
    const graphics = new PIXI.Graphics();
    
    // 设置背景色
    const hasBackground = !!options.background;
    if (hasBackground) {
      graphics.beginFill(this.hexToRgb(options.background));
    }
    
    // 设置边框
    if (options['border-width'] && options['border-color']) {
      graphics.lineStyle(options['border-width'], this.hexToRgb(options['border-color']));
    }
    
    graphics.moveTo(0, -size/2);
    graphics.lineTo(size/2, size/2);
    graphics.lineTo(-size/2, size/2);
    graphics.closePath();
    
    // 只有设置了背景色才调用endFill()
    if (hasBackground) {
      graphics.endFill();
    }
    
    graphics.position.set(x, y);
    this.stage.addChild(graphics);
    this.objects.push(graphics);
    
    return graphics;
  }

  // 渲染图片
  renderImage(x, y, imageUrl, options = {}) {
    const texture = PIXI.Texture.from(imageUrl);
    const sprite = new PIXI.Sprite(texture);
    
    // 设置滤镜
    if (options.filters) {
      sprite.filters = this.applyFilters(options.filters);
    }
    
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    this.stage.addChild(sprite);
    this.objects.push(sprite);
    
    return sprite;
  }

  // 渲染富文本
  renderText(x, y, text, options = {}) {
    const style = new PIXI.TextStyle({
      fontFamily: options['font-family'] || 'Arial',
      fontSize: options['font-size'] || 24,
      fill: options.color || '#ffffff',
      backgroundColor: options.background || null,
      fontWeight: options.bold ? 'bold' : 'normal',
      fontStyle: options.italic ? 'italic' : 'normal',
      underline: options.underline || false,
      lineThrough: options.lineThrough || false
    });
    
    const textObj = new PIXI.Text(text, style);
    textObj.anchor.set(0.5);
    textObj.position.set(x, y);
    this.stage.addChild(textObj);
    this.objects.push(textObj);
    
    return textObj;
  }

  // 应用滤镜
  applyFilters(filterOptions) {
    const filters = [];
    
    // 暂时注释掉滤镜功能，因为PIXI.filters可能会导致构建错误
    // if (filterOptions.grayscale) {
    //   // 使用内置的灰度滤镜
    //   filters.push(new PIXI.filters.ColorMatrixFilter().grayscale(1));
    // }
    // 
    // if (filterOptions.blur) {
    //   // 使用内置的模糊滤镜
    //   filters.push(new PIXI.filters.BlurFilter(filterOptions.blur));
    // }
    // 
    // if (filterOptions.brightness) {
    //   // 使用内置的亮度滤镜
    //   filters.push(new PIXI.filters.ColorMatrixFilter().brightness(filterOptions.brightness));
    // }
    
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

  // 辅助方法：将十六进制颜色转换为RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      parseInt(result[1], 16) << 16 | parseInt(result[2], 16) << 8 | parseInt(result[3], 16) : 
      0xffffff;
  }
}