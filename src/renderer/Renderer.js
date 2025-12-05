import * as PIXI from 'pixi.js';

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
    
    // 框选功能相关变量
    this.isSelecting = false; // 是否正在进行框选
    this.selectStart = { x: 0, y: 0 }; // 框选起始坐标
    this.selectEnd = { x: 0, y: 0 }; // 框选结束坐标
    this.selectBox = null; // 框选区域图形对象
    
    // 多选功能相关变量
    this.selectedObjects = []; // 当前选中的元素列表
    this.isDraggingGroup = false; // 是否正在进行组拖动
    this.dragOffset = { x: 0, y: 0 }; // 组拖动时的偏移量
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
          if (options.filters) {
            sprite.filters = this.applyFilters(options.filters)
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

  // 初始化画布的鼠标事件监听器（用于框选功能）
  initCanvasEvents(appStage) {
    // 存储当前渲染器引用，用于事件处理函数
    const renderer = this;
    this.appStage = appStage; // 保存app.stage的引用
    
        // 确保app.stage能够接收事件
    appStage.eventMode = 'static';
    appStage.cursor = 'default';
    appStage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000); // 设置较大的点击区域
    
    console.log('Canvas event listeners initialized on app.stage:', {
      appStageEventMode: appStage.eventMode,
      appStageCursor: appStage.cursor,
      appStageChildrenCount: appStage.children.length,
      appStageHitArea: appStage.hitArea
    });
    
    // 调试：检查Pixi事件系统是否正常工作
    console.log('Pixi事件系统调试信息:', {
      hasEventSystem: !!PIXI.EventSystem,
      hasFederatedEvents: !!PIXI.FederatedEvent,
      appStage: appStage,
      appStageParent: appStage.parent
    });
    
    // 鼠标按下事件 - 开始框选或组拖动
    appStage.on('pointerdown', (e) => {

       
        console.log('App.stage pointerdown event:', {
        target: e.target === appStage ? 'appStage' : e.target?.constructor?.name,
        globalPos: e.global,
        isSelecting: renderer.isSelecting,
        eventType: e.type,
        button: e.button
      });
      
      // 修改：允许在任何地方点击开始框选，而不仅限于空白区域
      console.log('Starting selection (modified: allow selection anywhere)');
      
      // 点击画布空白区域，清除之前的选择
      renderer.clearSelection();
      
      renderer.isSelecting = true;
      const globalPos = e.global;
      renderer.selectStart = { x: globalPos.x, y: globalPos.y };
      renderer.selectEnd = { x: globalPos.x, y: globalPos.y };
      
      console.log('Starting selection:', {
        isSelecting: renderer.isSelecting,
        selectStart: renderer.selectStart,
        target: e.target === appStage ? 'appStage' : e.target?.constructor?.name
      });
      
      // 创建框选区域图形对象
      if (!renderer.selectBox) {
        renderer.selectBox = new PIXI.Graphics();
        renderer.selectBox.eventMode = 'none'; // 设置为none，避免干扰stage的事件处理
        // 将框选区域添加到app.stage而不是内部stage，确保可见
        appStage.addChild(renderer.selectBox);
        console.log('Select box created and added to app.stage, children count:', appStage.children.length);
      }
      
      // 更新框选区域显示
      renderer.updateSelectBox();
    });
    
    // 鼠标移动事件 - 更新框选区域
 appStage.on('pointermove', (e) => {
      if (renderer.isSelecting) {
        console.log('App.stage pointermove event during selection:', { globalPos: e.global });
        
        const globalPos = e.global;
        renderer.selectEnd = { x: globalPos.x, y: globalPos.y };
        console.log('Updating selection box:', {
          selectStart: renderer.selectStart,
          selectEnd: renderer.selectEnd
        });
        renderer.updateSelectBox();
      }
    });
    
    // 鼠标释放事件 - 完成框选
     appStage.on('pointerup', (e) => {
      console.log('App.stage pointerup event, isSelecting:', renderer.isSelecting);
      if (renderer.isSelecting) {
        renderer.isSelecting = false;
        
        console.log('Performing selection...');
        // 执行选择逻辑
        renderer.performSelection();
        
        // 移除框选区域
        if (renderer.selectBox && renderer.selectBox.parent) {
          // 从app.stage中移除框选区域，而不是内部stage
          appStage.removeChild(renderer.selectBox);
          console.log('Select box removed from app.stage, remaining children:', appStage.children.length);
        }
        renderer.selectBox = null;
      }
    });
    
    // 鼠标在画布外释放事件
    appStage.on('pointerupoutside', (e) => {
      console.log('App.stage pointerupoutside event, isSelecting:', renderer.isSelecting);
      if (renderer.isSelecting) {
       renderer.isSelecting = false;
        
        console.log('Performing selection (outside)...');
        // 执行选择逻辑
        renderer.performSelection();
        
        // 移除框选区域
        if (renderer.selectBox && renderer.selectBox.parent) {
          // 从app.stage中移除框选区域，而不是内部stage
          appStage.removeChild(renderer.selectBox);
          console.log('Select box removed from app.stage (outside), remaining children:', appStage.children.length);
        }
        renderer.selectBox = null;
      }
    });
  }
  
  // 更新框选区域的显示
  updateSelectBox() {
    if (!this.selectBox) {
      console.error('updateSelectBox called but selectBox is null');
      return;
    }
    
    // 计算框选区域的边界（使用DOM坐标）
    const x1 = Math.min(this.selectStart.x, this.selectEnd.x);
    const y1 = Math.min(this.selectStart.y, this.selectEnd.y);
    const x2 = Math.max(this.selectStart.x, this.selectEnd.x);
    const y2 = Math.max(this.selectStart.y, this.selectEnd.y);
    
    // 计算框选区域的宽度和高度
    const width = x2 - x1;
    const height = y2 - y1;
    
    console.log('UpdateSelectBox with  global coordinates:', {
       globalstart: { x: x1, y: y1 },
       globalend: { x: x2, y: y2 },
      width, height
    });
    
    // 清除并重新绘制框选区域（使用DOM坐标）
    this.selectBox.clear();
    
    // 使用正确的Pixi Graphics绘制方法
    this.selectBox.beginFill(0x0099ff, 0.2); // 半透明蓝色填充
    this.selectBox.lineStyle(1, 0x0099ff); // 蓝色边框
    this.selectBox.drawRect(x1, y1, width, height);
    this.selectBox.endFill();
    
    console.log('Select box rendered at:', { x: x1, y: y1, width, height });
  }
  
  // 执行框选逻辑，选择区域内的所有元素
  performSelection() {
    // 计算框选区域的边界（使用DOM坐标）
    const x1 = Math.min(this.selectStart.x, this.selectEnd.x);
    const y1 = Math.min(this.selectStart.y, this.selectEnd.y);
    const x2 = Math.max(this.selectStart.x, this.selectEnd.x);
    const y2 = Math.max(this.selectStart.y, this.selectEnd.y);
    
    console.log('Performing selection with DOM bounds:', {
      x1, y1, x2, y2,
      objectsCount: this.objects.length
    });
    
    // 清除之前的选中状态
    this.clearSelection();
    
    // 检查每个元素是否在框选区域内
    this.objects.forEach(obj => {
      try {
        // 获取元素的全局边界
        const globalBounds = obj.getBounds(true); // true 表示获取全局边界
        
        console.log('Checking object:', {
          type: obj.constructor.name,
          globalBounds,
          isInSelection: globalBounds.x + globalBounds.width >= x1 && globalBounds.x <= x2 && 
                        globalBounds.y + globalBounds.height >= y1 && globalBounds.y <= y2
        });
        
        // 检查元素是否与框选区域相交
        if (globalBounds.x + globalBounds.width >= x1 && globalBounds.x <= x2 && 
            globalBounds.y + globalBounds.height >= y1 && globalBounds.y <= y2) {
          this.selectedObjects.push(obj);
          console.log('Object selected:', obj.constructor.name);
        }
      } catch (error) {
        console.error('获取元素边界时出错:', error);
      }
    });
    
    console.log('Selection completed:', {
      selectedObjectsCount: this.selectedObjects.length
    });
    
    // 为选中的元素添加视觉反馈
    this.highlightSelectedObjects();
    
    // 通知外部选中了这些元素
    if (typeof this.onSelect === 'function' && this.selectedObjects.length > 0) {
      this.onSelect(this.selectedObjects[0], this.selectedObjects);
    }
  }
  
  // 清除所有选中状态
  clearSelection() {
    // 移除所有选中元素的视觉反馈
    this.selectedObjects.forEach(obj => {
      this.removeHighlight(obj);
    });
    
    // 清空选中元素列表
    this.selectedObjects = [];
  }
  
  // 为选中的元素添加视觉反馈
  highlightSelectedObjects() {
    this.selectedObjects.forEach(obj => {
      // 为元素添加选中高亮效果
      if (!obj._highlight) {
        obj._highlight = new PIXI.Graphics();
        // 将高亮边框添加到app.stage而不是内部stage，确保正确显示
        this.appStage.addChild(obj._highlight);
      }
      
      try {
        // 获取元素的全局边界
        const globalBounds = obj.getBounds(true);
        const padding = 5;
        
        // 清除并重新绘制高亮边框
        obj._highlight.clear();
        obj._highlight.lineStyle(2, 0x00ff00, 1); // 绿色边框
        
        // 使用全局坐标绘制高亮边框
        obj._highlight.drawRoundedRect(
          globalBounds.x - padding,
          globalBounds.y - padding,
          globalBounds.width + padding * 2,
          globalBounds.height + padding * 2,
          5
        );
        
        console.log('Highlight added:', {
          type: obj.constructor.name,
          globalBounds,
          highlightPosition: { x: globalBounds.x - padding, y: globalBounds.y - padding }
        });
      } catch (error) {
        console.error('添加高亮效果时出错:', error);
      }
    });
  }
  
  // 移除元素的视觉反馈
  removeHighlight(obj) {
    if (obj._highlight) {
      // 从stage中移除高亮边框
      if (obj._highlight.parent) {
        obj._highlight.parent.removeChild(obj._highlight);
      }
      obj._highlight.destroy();
      obj._highlight = null;
    }
  }
  
  // 将图形对象添加到舞台并设置位置
  addToStage(display, x, y) {
    console.log('Renderer.addToStage', { x, y, type: display?.constructor?.name })
    display.position.set(x, y)
    this.stage.addChild(display)
    this.objects.push(display)
    console.log(`x: ${x}, y: ${y}`)
    if (this.canvasStore && this.canvasStore.objects) {
      this.canvasStore.objects.push(display);
    }
    
    // 选择支持：绑定指针事件，点击通知外部选中
    try {
      display.eventMode = 'static';
      display.cursor = 'pointer';
      
      // 存储当前渲染器引用，用于事件处理函数
      const renderer = this;
      
      // 拖动状态变量，使用闭包保存
      const dragState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0
      };
      
      // 获取canvas元素
      const canvas = this.appStage?.parent?.canvas || document.querySelector('canvas');
      
      if (!canvas) {
        console.error('Canvas element not found for element drag event binding');
        return;
      }
      
      // 鼠标按下事件 - 开始拖动或组拖动
      display.on('pointerdown', (e) => {
        e.stopPropagation(); // 阻止事件冒泡，避免影响画布拖动
        
        // 点击选中对象（如果不是多选状态，则清除之前的选择）
        if (typeof renderer.onSelect === 'function') {
          renderer.onSelect(display);
        }
        
        // 检查是否在多选状态下
        if (renderer.selectedObjects.length > 1 && renderer.selectedObjects.includes(display)) {
          // 开始组拖动
          renderer.isDraggingGroup = true;
          
          // 计算鼠标相对于元素位置的偏移量
          const localPos = display.toLocal(e.global);
          renderer.dragOffset.x = localPos.x;
          renderer.dragOffset.y = localPos.y;
        } else {
          // 单选拖动
          // 开始拖动
          dragState.isDragging = true;
          
          // 计算鼠标相对于元素位置的偏移量
          const localPos = display.toLocal(e.global);
          dragState.offsetX = localPos.x;
          dragState.offsetY = localPos.y;
        }
        
        display.cursor = 'grabbing';
      });
      
      // 鼠标移动事件 - 拖动元素或组
      display.on('pointermove', (e) => {
        // 处理组拖动
        if (renderer.isDraggingGroup) {
          e.stopPropagation(); // 阻止事件冒泡
          
          // 计算新位置
          const globalPos = e.global;
          const stagePos = renderer.stage.toLocal(globalPos);
          
          // 计算移动距离
          const deltaX = stagePos.x - renderer.dragOffset.x;
          const deltaY = stagePos.y - renderer.dragOffset.y;
          
          // 检查是否有选中的对象
          if (!renderer.selectedObjects || renderer.selectedObjects.length === 0) {
            console.warn('No selected objects for group dragging');
            return;
          }
          
          // 移动选中的第一个元素到新位置
          const firstObj = renderer.selectedObjects[0];
          if (!firstObj || !firstObj.position) {
            console.warn('Invalid first object for group dragging');
            return;
          }
          
          const firstDeltaX = deltaX - firstObj.position.x;
          const firstDeltaY = deltaY - firstObj.position.y;
          
          // 移动所有选中的元素
          renderer.selectedObjects.forEach(obj => {
            if (obj && obj.position) {
              obj.position.x += firstDeltaX;
              obj.position.y += firstDeltaY;
            }
          });
          
          // 更新小地图
          if (renderer.miniMapContent) {
            renderer.renderMiniMap();
          }
          return;
        }
        
        // 处理单选拖动
        if (!dragState.isDragging) return;
        
        e.stopPropagation(); // 阻止事件冒泡
        
        // 计算元素的新位置
        const newLocalPos = display.parent.toLocal(e.global);
        display.position.x = newLocalPos.x - dragState.offsetX;
        display.position.y = newLocalPos.y - dragState.offsetY;
        
        // 更新小地图
        if (renderer.miniMapContent) {
          renderer.renderMiniMap();
        }
      });
      
      // 鼠标抬起事件 - 结束拖动
      display.on('pointerup', () => {
        // 结束组拖动
        if (renderer.isDraggingGroup) {
          renderer.isDraggingGroup = false;
        }
        
        // 结束单选拖动
        if (dragState.isDragging) {
          dragState.isDragging = false;
        }
        
        display.cursor = 'pointer';
      });
      
      // 鼠标移出元素事件 - 结束拖动
      display.on('pointerupoutside', () => {
        // 结束组拖动
        if (renderer.isDraggingGroup) {
          renderer.isDraggingGroup = false;
        }
        
        // 结束单选拖动
        if (dragState.isDragging) {
          dragState.isDragging = false;
        }
        
        display.cursor = 'pointer';
      });
      
    } catch (error) {
      console.error('Error adding event listeners to display object:', error);
    }
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
      if (this.canvasStore && this.canvasStore.objects) {
        this.canvasStore.objects = this.canvasStore.objects.filter(o => !removed.includes(o));
      }
      this.renderMiniMap();

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
    // 只有非文本元素才更新_style属性
    if (shape.type !== 'text') {
      display._style = next
    }
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
