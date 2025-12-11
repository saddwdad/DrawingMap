import * as PIXI from 'pixi.js';
import { useCanvasStore } from '@/Main-page/Store/canvasStore';
import { useHistoryStore } from '@/History/History';
import { nextUniqueId } from '@/History/idGenerator';
import { markRaw } from 'vue';
export class Renderer {
  

  
  constructor(stage, app) {
    this.stage = stage;
    this.app = app;
    this.objects = [];
    this.objectMap = [];
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
    this.canvasStore = useCanvasStore()
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


  // 渲染图片
  renderImage(x, y, imageUrl, options = {}) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const texture = PIXI.Texture.from(img)
          const sprite = new PIXI.Sprite(texture)
          sprite.imageUrl = imageUrl
          sprite.needsRenderFix = true;
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

  // 初始化画布的鼠标事件监听器（用于框选功能）
  initCanvasEvents(appStage) {
    const canvasStore = useCanvasStore()
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
      const isLeftClick = e.button === 0
      const isMiddleClick = e.button === 1
      const isRightClick = e.button === 2
      const currentTool = canvasStore.currentTool
      const isSelect = currentTool === 'select'


    if(isLeftClick && isSelect ){
        console.log('App.stage pointerdown event:', {
        target: e.target === appStage ? 'appStage' : e.target?.constructor?.name,
        globalPos: e.global,
        isSelecting: renderer.isSelecting,
        eventType: e.type,
        button: e.button,
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
    }
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
  addToStage(display, x, y, existingId = null) {
    const canvasStore = useCanvasStore()
    const historyStore = useHistoryStore()
    console.log('Renderer.addToStage', { x, y, type: display?.constructor?.name })
    display.position.set(x, y)
    this.stage.addChild(display)
    this.objects.push(display)
    display.id = existingId || nextUniqueId()
    this.objectMap.push(display.id)
    console.log(`x: ${x}, y: ${y}`)
    if (this.canvasStore && this.canvasStore.objects) {
      this.canvasStore.objects.push(markRaw(display));
    }
    if (display.needsRenderFix === undefined) {
      display.needsRenderFix = false; 
    }
    if(this.canvasStore){
      canvasStore.notifyObjectsChange()
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
        const canvasStore = useCanvasStore()
        const currentTool = canvasStore.currentTool;
        // 点击选中对象（如果不是多选状态，则清除之前的选择）
        if(currentTool === 'select'){
            if (typeof renderer.onSelect === 'function') {
              renderer.onSelect(display);
            }
            
            // 检查是否在多选状态下
            if (renderer.selectedObjects.length > 1 && renderer.selectedObjects.includes(display)) {
              // 开始组拖动
              renderer.isDraggingGroup = true;
              
              // 计算鼠标相对于元素位置的偏移量
              const firstObj = renderer.selectedObjects[0];
              const stageClickPos = renderer.stage.toLocal(e.global);
              const localPos = display.toLocal(e.global);
              renderer.dragOffset.x = stageClickPos.x - firstObj.position.x;
              renderer.dragOffset.y = stageClickPos.y - firstObj.position.y;
            } else {
              // 单选拖动
              // 开始拖动
              dragState.isDragging = true;
              
              // 计算鼠标相对于元素位置的偏移量
              const localPos = display.toLocal(e.global);
              dragState.offsetX = localPos.x;
              dragState.offsetY = localPos.y;
            }
            if (!renderer.isDraggingGroup && !renderer.selectedObjects.includes(display)) {
        // 如果是单选拖动，selectedObjects 应该只有这一个
                renderer.selectedObjects = [display]; 
                // 警告：如果 selectedObjects 是 Pinia Store 的 state 并且不能直接覆盖，
                // 你可能需要调用一个 Pinia Action：canvasStore.setSelectedObjects([display])。
                // 但既然你之前是直接 .map()，我们假设它可以被直接赋值。
            }
            this.dragStartSnapshot = this.selectedObjects.map(obj => ({
                id: obj.id,
                x: obj.position.x,
                y: obj.position.y
            }));
            console.log('最早的他妈的位置',renderer.dragStartSnapshot)
            display.cursor = 'grabbing';
        }
      });
      
      // 鼠标移动事件 - 拖动元素或组
      display.on('pointermove', (e) => {

        // 处理组拖动
        if (renderer.isDraggingGroup) {
          // e.stopPropagation(); // 阻止事件冒泡
          
          let shouldForceRender = false; 
          const objectsToIsolate = []; // 存放需要被保护的新图形
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
          if (!renderer.selectedObjects || renderer.selectedObjects.length === 0) {
          renderer.isDraggingGroup = false; 
          return;
          }
          // 移动选中的第一个元素到新位置
          const firstObj = renderer.selectedObjects[0];
          if (!firstObj || !firstObj.position) {
            console.warn('Invalid first object for group dragging');
            return;
          }
          console.log('当前触发计数为：' ,canvasStore.objectChangeKey)
          const firstDeltaX = deltaX - firstObj.position.x;
          const firstDeltaY = deltaY - firstObj.position.y;
          
          // 移动所有选中的元素
          renderer.selectedObjects.forEach(obj => {
            
            if (obj && obj.position) {
              obj.position.x += firstDeltaX;
              obj.position.y += firstDeltaY;
            }
            if (obj.needsRenderFix === true) {
              shouldForceRender = true;
              if (renderer.app && renderer.app.renderer) {
                renderer.app.renderer.render(renderer.app.stage);
              }
            } 
            // if (obj.needsRenderFix === false) {
            //  objectsToIsolate.push(obj);
            // }


            // 找出需要被保护的新图形
          });
          // if (shouldForceRender) {
    
          //       objectsToIsolate.forEach(obj => {
          //         console.log('删了没我操')
          //           obj.visible = false; 
          //       });

          //       // 2. 强制渲染整个舞台 (World Transform 仅刷新剩下的，即需要修复的对象)
          //       if (renderer.app && renderer.app.renderer) {
          //           renderer.app.renderer.render(renderer.app.stage); 
          //       }

          //       // 3. 🌟 立即将新图形重新设置为可见
          //       objectsToIsolate.forEach(obj => {
          //         console.log('加了没我操')
          //           obj.visible = true; 
          //           if (obj.parent) {
          //               // PIXI 方法：强制计算并应用此对象及其子对象的 World Transform 矩阵。
          //               obj.parent.updateTransform(); 
          //           }
          //       });
          // }
          
          

          console.log('当前触发计数为：' ,canvasStore.objectChangeKey)
          


          if (canvasStore.notifyObjectsChange) {
              canvasStore.notifyObjectsChange(); 
          }
          return;
        }
        
        // 处理单选拖动
        if (!dragState.isDragging) return;
        
        // e.stopPropagation(); // 阻止事件冒泡
        
        // 计算元素的新位置
        const newLocalPos = display.parent.toLocal(e.global);
        display.position.x = newLocalPos.x - dragState.offsetX;
        display.position.y = newLocalPos.y - dragState.offsetY;
        if (canvasStore.notifyObjectsChange) {
          canvasStore.notifyObjectsChange(); 
        }
        if(display.needsRenderFix){
          console.log('执行了没他妈的操')
          if (this.app && this.app.renderer) {
            console.log('执行到强制渲染')
            this.app.renderer.render(this.app.stage);
          }
        }
        if (canvasStore.notifyObjectsChange) {
              canvasStore.notifyObjectsChange(); 
        }
        console.log('当前触发计数为：' ,canvasStore.objectChangeKey)
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
        const dragEndSnapshot = this.selectedObjects.map(obj => ({
        id: obj.id,
        x: obj.position.x,
        y: obj.position.y
      }));
      console.log('最后的他妈的位置',dragEndSnapshot)

      const startSnapshotForHistory = this.dragStartSnapshot;

          // 检查是否有实际移动发生（防止无效的历史记录）
          if (JSON.stringify(startSnapshotForHistory) !== JSON.stringify(dragEndSnapshot)) {
        
            historyStore.recordAction({
                      type: `move_group_${this.selectedObjects.length > 1 ? 'multiple' : 'single'}`,
                      
                      // 撤销操作：将每个对象恢复到开始时的位置
                      undo: () => {
                          startSnapshotForHistory.forEach(startProp => {
                              const obj = this.canvasStore.getObjectById(startProp.id);
                              if (obj) {
                                  this.canvasStore.renderer.updateShape(obj, { 
                                      x: startProp.x, 
                                      y: startProp.y 
                                  });
                              }
                          });
                          this.canvasStore.notifyObjectsChange();
                      },
                      
                      // 重做操作：将每个对象移动到结束时的位置
                      redo: () => {
                          dragEndSnapshot.forEach(endProp => {
                              const obj = this.canvasStore.getObjectById(endProp.id);
                              if (obj) {
                                  this.canvasStore.renderer.updateShape(obj, { 
                                      x: endProp.x, 
                                      y: endProp.y 
                                  });
                              }
                          });
                          this.canvasStore.notifyObjectsChange();
                      }
                  });
                  console.log('--- Drag End (记录移动历史记录) ---');
          }

          // 重置状态
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
  // // 使用圆-矩形最近点测试判定命中对象并移除，返回删除数量
  // eraseAt(x, y, radius) {
  //   const p = new PIXI.Point(x, y)
  //   const gp = this.stage.toGlobal(p)
  //   const removed = []
  //   for (let i = 0; i < this.objects.length; i++) {
  //     const obj = this.objects[i]
  //     const b = obj.getBounds()
  //     const cx = gp.x
  //     const cy = gp.y
  //     const rx = Math.max(b.x, Math.min(cx, b.x + b.width))
  //     const ry = Math.max(b.y, Math.min(cy, b.y + b.height))
  //     const dx = cx - rx
  //     const dy = cy - ry
  //     if (dx * dx + dy * dy <= radius * radius) {
  //       this.stage.removeChild(obj)
  //       obj.destroy?.()
  //       removed.push(obj)
  //     }
  //   }
  //   if (removed.length) {
  //     this.objects = this.objects.filter(o => !removed.includes(o))
  //     if (this.canvasStore && this.canvasStore.objects) {
  //       this.canvasStore.objects = this.canvasStore.objects.filter(o => !removed.includes(o));
  //     }
  //     this.renderMiniMap();

  //   }
  //   return removed.length
  // }

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
  updateShape(display, props = {}, shouldRecord = true) {
    const historyStore = useHistoryStore()
    const canvasStore = useCanvasStore()
    if (!display) return
    if (props.x !== undefined) {
        display.position.x = props.x;
    }
    if (props.y !== undefined) {
        display.position.y = props.y;
    }
    // 检查是否为图片元素
    const isPicture = display.imageUrl !== undefined;

    // 初始化样式更新对象
    let next = {};
    if (!isPicture && display._shape) {
      const style = display._style || {};
      next = {
        background: props.background ?? style.background ?? null,
        borderWidth: props['border-width'] ?? style.borderWidth ?? 0,
        borderColor: props['border-color'] ?? style.borderColor ?? null,
      };
    }
    // 更新元素属性
    if (isPicture) {
      // 更新图片滤镜
      if (props.filters !== undefined) {
        display.rawFilters = props.filters;
        display.filters = null; // 清除所有现有滤镜
        display.tint = 0xFFFFFF; // 重置色调
        
        if (props.filters !== 'none') {
          // 简化滤镜实现，只使用色调来实现滤镜效果
          if (props.filters === 'warm') display.tint = 0xffcc99;
          else if (props.filters === 'cool') display.tint = 0x99ccff;
          else if (props.filters === 'green') display.tint = 0x66ff66;
        }

        if(this.canvasStore){
          canvasStore.notifyObjectsChange();
        }
      }
      
      // 更新图片缩放
      if (props.scale !== undefined) {
        if (typeof props.scale === 'object' && props.scale !== null) {
          if (typeof props.scale.x === 'number') display.scale.x = props.scale.x;
          if (typeof props.scale.y === 'number') display.scale.y = props.scale.y;
        }

        if(this.canvasStore){
          canvasStore.notifyObjectsChange();
        }
      }

    } 
    // 更新常规形状或文本元素
    else if (display._shape) {
      const shape = display._shape;
      
      // 更新几何尺寸
      if (shape.type === 'rect') {
        const width = props.width ?? shape.width;
        const height = props.height ?? shape.height;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.rect(-width / 2, -height / 2, width, height);
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.width = width;
        display._shape.height = height;
      } else if (shape.type === 'circle') {
        const radius = props.radius ?? shape.radius;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.circle(0, 0, radius);
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.radius = radius;
      } else if (shape.type === 'triangle') {
        const size = props.size ?? shape.size;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.moveTo(0, -size / 2);
        display.lineTo(size / 2, size / 2);
        display.lineTo(-size / 2, size / 2);
        display.closePath();
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.size = size;
      } else if (shape.type === 'text') {
        // 文本更新：支持样式与内容
        if (typeof props.text === 'string') {
          display.text = props.text;
        }
        // 对于文本元素，样式直接在display.style中
        const s = display.style;
        // 确保s是有效的样式对象
        if (s) {
          if (props['font-family']) s.fontFamily = props['font-family'];
          if (props['font-size']) s.fontSize = props['font-size'];
          if (props.color) s.fill = props.color;
          if (props.background !== undefined) s.backgroundColor = props.background;
          if (props.bold !== undefined) s.fontWeight = props.bold ? 'bold' : 'normal';
          if (props.italic !== undefined) s.fontStyle = props.italic ? 'italic' : 'normal';
          if (props.underline !== undefined) s.underline = !!props.underline;
          if (props.lineThrough !== undefined) s.lineThrough = !!props.lineThrough;
          
          // 强制更新文本，确保样式变更立即生效
          // display.updateText();
        }
      }
    }
    // 更新_style属性（仅适用于非文本、非图片元素）
    if (!isPicture && display._shape && display._shape.type !== 'text') {
      display._style = next;
    }
    if (props.opacity !== undefined) display.alpha = props.opacity
    const storeObject = canvasStore.objects.find(o => o.id === display.id);
    if (storeObject) {
          if (props.x !== undefined) storeObject.x = props.x;
          if (props.y !== undefined) storeObject.y = props.y;
          canvasStore.forceViewpotUpdate()
    }
    
    
    if(this.canvasStore){
      canvasStore.notifyObjectsChange();
    }
  }

   applyShapeChange(display, props = {}) {
    const historyStore = useHistoryStore()
    if (!display) return
    
    // 检查是否为图片元素
    const isPicture = display.imageUrl !== undefined;


    // 初始化样式更新对象
    let next = {};
    if (!isPicture && display._shape) {
      const style = display._style || {};
      next = {
        background: props.background ?? style.background ?? null,
        borderWidth: props['border-width'] ?? style.borderWidth ?? 0,
        borderColor: props['border-color'] ?? style.borderColor ?? null,
      };
    }
    // 更新元素属性
    if (isPicture) {
      // 更新图片滤镜
      if (props.filters !== undefined) {
        display.rawFilters = props.filters;
        display.filters = null; // 清除所有现有滤镜
        display.tint = 0xFFFFFF; // 重置色调
        
        if (props.filters !== 'none') {
          // 简化滤镜实现，只使用色调来实现滤镜效果
          if (props.filters === 'warm') display.tint = 0xffcc99;
          else if (props.filters === 'cool') display.tint = 0x99ccff;
          else if (props.filters === 'green') display.tint = 0x66ff66;
        }
      }
      
      // 更新图片缩放
      if (props.scale !== undefined) {
        if (typeof props.scale === 'object' && props.scale !== null) {
          if (typeof props.scale.x === 'number') display.scale.x = props.scale.x;
          if (typeof props.scale.y === 'number') display.scale.y = props.scale.y;
        }
      }
    } 
    // 更新常规形状或文本元素
    else if (display._shape) {
      const shape = display._shape;
      
      // 更新几何尺寸
      if (shape.type === 'rect') {
        const width = props.width ?? shape.width;
        const height = props.height ?? shape.height;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.rect(-width / 2, -height / 2, width, height);
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.width = width;
        display._shape.height = height;
      } else if (shape.type === 'circle') {
        const radius = props.radius ?? shape.radius;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.circle(0, 0, radius);
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.radius = radius;
      } else if (shape.type === 'triangle') {
        const size = props.size ?? shape.size;
        display.clear();
        const fillStyle = next.background ? this.hexToRgb(next.background) : null;
        const strokeStyle = (next.borderWidth && next.borderColor) ? {
          width: next.borderWidth,
          color: this.hexToRgb(next.borderColor)
        } : null;
        display.moveTo(0, -size / 2);
        display.lineTo(size / 2, size / 2);
        display.lineTo(-size / 2, size / 2);
        display.closePath();
        if (fillStyle !== null) display.fill(fillStyle);
        if (strokeStyle) display.stroke(strokeStyle);
        display._shape.size = size;
      } else if (shape.type === 'text') {
        // 文本更新：支持样式与内容
        if (typeof props.text === 'string') {
          display.text = props.text;
        }
        // 对于文本元素，样式直接在display.style中
        const s = display.style;
        if (s) {
          if (props['font-family']) s.fontFamily = props['font-family'];
          if (props['font-size']) s.fontSize = props['font-size'];
          if (props.color) s.fill = props.color;
          if (props.background !== undefined) s.backgroundColor = props.background;
          if (props.bold !== undefined) s.fontWeight = props.bold ? 'bold' : 'normal';
          if (props.italic !== undefined) s.fontStyle = props.italic ? 'italic' : 'normal';
          if (props.underline !== undefined) s.underline = !!props.underline;
          if (props.lineThrough !== undefined) s.lineThrough = !!props.lineThrough;
          
          // 强制更新文本，确保样式变更立即生效
          // display.updateText();
        }
      }
    }
    // 更新_style属性（仅适用于非文本、非图片元素）
    if (!isPicture && display._shape && display._shape.type !== 'text') {
      display._style = next;
    }
    if (props.opacity !== undefined) display.alpha = props.opacity
    
    // 更新不透明度
    if (props.opacity !== undefined) display.alpha = props.opacity;
    
    if(this.canvasStore){
      this.canvasStore.notifyObjectsChange()
    }

    // 强制重新渲染画布，确保属性更改立即显示
    if (this.app && this.app.renderer) {
      this.app.renderer.render(this.stage);
    }

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

  findObjectById(id) {
    if(!id){
      console.log('没有传入id')
      return undefined
    }
    const foundObject = this.objects.find(obj => {
      return obj && obj.id === id
    })
    if(!foundObject){
      console.log('未找到为此id的对象')
    }
    return foundObject
  }
}
