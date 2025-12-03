<template>
  <a-layout class="main-layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="main-header">
      <div class="header-content">
        <!-- 左侧标题+图标 -->
        <div class="header-left">
          <FaPalette class="header-icon" />
          <h1 class="header-title">Pixi画布编辑器</h1>
        </div>
        <!-- 右侧功能按钮 -->
        <div class="header-right">
          <a-button type="default" shape="round" :icon="createVNode(SaveOutlined)">保存</a-button>
          <a-button type="default" shape="round" :icon="createVNode(ShareAltOutlined)" style="margin-left: 8px;">分享</a-button>
        </div>
      </div>
    </a-layout-header>

    <!-- 主内容区 -->
    <a-layout-content class="main-content">
      <!-- 浮动工具栏（由uiStore管理） -->
      <div ref="toolbarRef" class="floating-toolbar" :style="uiStore.toolbarStyle">
        <div class="drag-handle">🖐️ 拖动</div>
        <toolbar />
      </div>

      <!-- 浮动参数面板 -->
      
      <div class="floating-param">
        <paramctl />
        <!-- 新增：画布控制按钮（测试缩放/重置） -->
        <div class="canvas-control">
          <p>当前缩放：{{ canvasStore.scalePercent }}</p>
          <a-button size="small" type="primary" @click="canvasStore.resetCanvas()">重置画布位置</a-button>
        </div>
      </div>
      <!-- 核心：画布容器（固定铺满屏幕，位置不动） -->
      <div class="canvas-container" ref="canvasContainerRef" 
           @wheel="handleScale"
           @mousedown="handleMouseDown"
           @mousemove="handleMouseMove"
           @mouseup="handleMouseUp"
           @mouseleave="handleMouseLeave"
           @contextmenu.prevent = "handleCanvasContextMenu"
           :style="{cursor: getCursorStyle()}">
        <!-- 画布内容（可缩放、可拖动，样式由pixi管理） -->
        <canvas id="pixi-mount" ref="pixiMountRef"></canvas>
        <!-- 隐藏的文件输入框，用于图片上传 -->
        <input 
          type="file" 
          ref="fileInputRef" 
          style="display: none;" 
          accept="image/*" 
          @change="handleFileUpload"
        >
        <div class="floating-minimap">
          <minimap ref="minimapRef" />
        </div>
        <contextMenu/>
      </div>

    </a-layout-content>

    <!-- 底部页脚 -->
    <a-layout-footer class="main-footer">
      ©2025 Pixi + Vue + Ant Design Vue 画布编辑器 | 纯UI版
    </a-layout-footer>
  </a-layout>
</template>

<script setup>
import { defineComponent, h, createVNode, computed, watch, ref, onMounted, onUnmounted, nextTick} from 'vue'
import { storeToRefs } from 'pinia'
import { FontAwesomeIcon  } from '@fortawesome/vue-fontawesome'
import { faPalette } from '@fortawesome/free-solid-svg-icons'
// 引入子组件
import minimap from './minimap/minimap.vue'
import toolbar from '@/Toolbar/toolbar.vue'
import paramctl from '@/Param-Controller/paramctl.vue'
import * as PIXI from 'pixi.js'
// 引入AntD图标
import { SaveOutlined, ShareAltOutlined } from '@ant-design/icons-vue'

import { useUiStore } from '@/Main-page/Store/UIStore'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'
// 引入渲染器
import { Renderer } from '@/renderer/Renderer'
import { useContextMenuStore } from './contextMenu/contextMenu'
import contextMenu from './contextMenu/contextMenu.vue'
import { context } from 'ant-design-vue/es/vc-image/src/PreviewGroup'




const canvasContainerRef = ref(null)
const pixiMountRef = ref(null)
const toolbarRef = ref(null)
const fileInputRef = ref(null)
const minimapRef = ref(null)
let resizeObserver = null
let app = null
let stage = null
let renderer = null
let minimapApp = null
const uiStore = useUiStore()
const canvasStore = useCanvasStore()
const contextMenuStore = useContextMenuStore()
const { 

    minimap:minimapConfig,

} = storeToRefs(canvasStore)

const {
    scaleCanvas, 
    resetCanvas,
    startDrag,
    dragCanvas,
    dragViewport,
    endDrag,
    isDragging
} = canvasStore
// 橡皮擦拖拽状态：左键按下为 true，松开/离开为 false
const isErasing = ref(false)
const objects = computed(() => canvasStore.renderer?.objects || [])
const resizePixi = () => {
    if (!app || !app.renderer || !canvasContainerRef.value) return;

    const { clientWidth, clientHeight } = canvasContainerRef.value;
    // 1. 更新 Store 中的视口尺寸
    canvasStore.initViewportSize(clientWidth, clientHeight);
    // 2. 重新设置 Pixi 渲染器的尺寸
    app.renderer.resize(clientWidth, clientHeight);
    // 3. 重新设置 Stage 的 position (确保它位于容器的视觉中心)
    if (stage) {
        stage.position.set(clientWidth / 2, clientHeight / 2);
    }
    // 4. 强制更新一次视口
    updatePixiViewport();
}

// 初始化Pixi应用
const initPixi = async () => {
  if (!canvasContainerRef.value || !pixiMountRef.value) return

  const { width, height } = canvasContainerRef.value.getBoundingClientRect()
  // 1. 创建 Pixi 应用
  canvasStore.initViewportSize(width,height)
  app = new PIXI.Application();
  await app.init(
    {
    width: width,
    height: height,
    backgroundColor: 0x1a1a1a, // 对应 Store 的 bgColor
    canvas: pixiMountRef.value,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  }
)
  // 2. 创建根容器（作为视角容器，所有内容都放在这个容器里）
  stage = new PIXI.Container()
  app.stage.addChild(stage)
  
  // 3. 初始同步：直接按当前容器尺寸将舞台居中，并应用视口变换
  stage.pivot.set(canvasStore.viewport.x, canvasStore.viewport.y)
  stage.scale.set(canvasStore.viewport.scale, canvasStore.viewport.scale)
  stage.position.set(width / 2, height / 2)
  
  // 再次调用一次通用更新函数，确保与后续逻辑保持一致
  updatePixiViewport()

  // 4. 测试：添加无限网格（验证真无限）
  // drawInfiniteGrid(stage)

  // 5. 初始化渲染器并设置到store，直接使用stage作为绘制容器
  renderer = new Renderer(stage);
  canvasStore.setRenderer(renderer);

  await nextTick()
  if (minimapRef.value) {
    // 修复：你的minimap.vue已经通过useCanvasStore获取了所有需要的状态，不需要传入renderer和scale
    // 只需要调用initMiniMap，不需要传递额外参数（小地图内部会自己获取store数据）
    minimapApp = await minimapRef.value.initMiniMap()
  }

  // 6. 添加鼠标点击事件处理
  // 使用更可靠的方式：直接在canvas元素上绑定点击事件
  const canvas = pixiMountRef.value;
  canvas.addEventListener('click', handleCanvasClick);

  watch(
    viewport,
    (newViewport) => {
      // 增加空值检查（防御性编程）
      if (!newViewport || !minimapConfig.value || !minimapConfig.value.viewportSize) return;
      // 小地图内部会自己监听状态变化，不需要在这里手动调用renderer
    },
    { deep: true, immediate: true }
  )

  // 监听绘制对象变化，小地图会自动重绘（因为minimap.vue已经监听了objects）
  watch(
    () => objects.value.length,
    () => {
      // 不需要手动调用，小地图内部已处理
    },
    { immediate: true }
  )

}

// 处理画布点击事件
const handleCanvasClick = (event) => {
  // 阻止事件冒泡，避免与画布拖动事件冲突
  event.stopPropagation();
  
  // 获取当前工具
  const currentTool = canvasStore.currentTool;
  console.log('handleCanvasClick触发，当前工具:', currentTool);
  
  // 获取画布容器的实际尺寸
  const rect = pixiMountRef.value.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  // 使用统一的坐标转换方法
  const { x, y } = canvasStore.screenToWorld(mouseX, mouseY);
  
  // 根据当前工具执行不同操作（优先处理pending预览）
  if (canvasStore.pendingItem) {
    canvasStore.finalizePending(x, y)
    return
  }
  if (currentTool === 'picture') {
    if (canvasStore.currentImageUrl) {
      canvasStore.renderImageAndRecord(
            x, 
            y, 
            canvasStore.currentImageUrl, 
            canvasStore.currentImageFilter, 
            canvasStore.currentImageScale
        )
    }
    return
  }
  // 选择工具：仅用于点击对象选中，不在画布空白处执行绘制
  if (currentTool === 'select') {
    return
  }
  if (currentTool === 'pen') {
    // 文本工具：使用面板文本内容直接放置
    canvasStore.preparePendingText(canvasStore.currentTextContent)
    canvasStore.finalizePending(x, y)
  } //else if (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'triangle') {
  //   canvasStore.drawShape(x, y, currentTool);
  // }
}

// 处理鼠标按下事件 - 区分左键和右键
const handleMouseDown = (e) => {
  // 右键按下（按钮值为2）时，开始拖动画布
  if (e.button === 1 ) {
    // 阻止默认右键菜单
    e.preventDefault();
    startDrag(e);
    contextMenuStore.hideMenu()
  }
  if (e.button === 0 ){
    contextMenuStore.hideMenu()
  }
  // 左键按下时，不执行拖动画布，由Pixi的点击事件处理绘制
  if (e.button === 0 && canvasStore.currentTool === 'eraser') {
    // 开始擦除：记录状态并在当前点进行一次擦除
    isErasing.value = true
    const rect = pixiMountRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x, y } = canvasStore.screenToWorld(mouseX, mouseY)
    canvasStore.eraseAt(x, y)
    
  }


}

// 处理鼠标移动事件
  let dragDebounceTimer = null;
  const handleMouseMove = (e) => {
    clearTimeout(dragDebounceTimer);
  dragDebounceTimer = setTimeout(() =>{
    if (canvasStore.isDragging) {
    dragViewport(e);
    return;
  }
  // 拖拽中持续擦除：将屏幕坐标转换为世界坐标并调用擦除
  if (isErasing.value && canvasStore.currentTool === 'eraser') {
    const rect = pixiMountRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x, y } = canvasStore.screenToWorld(mouseX, mouseY)
    canvasStore.eraseAt(x, y)
    return;
  }
  if (canvasStore.pendingType === 'picture' && canvasStore.pendingImageUrl) {
    const rect = pixiMountRef.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const { x, y } = canvasStore.screenToWorld(mouseX, mouseY);
    if (canvasStore.pendingItem) {
      try { canvasStore.pendingItem.position.set(x, y); } catch {}
    }
  }
    }, 0.1);
  }

// 处理鼠标释放事件
const handleMouseUp = (e) => {
  endDrag(e);
  // 结束擦除
  isErasing.value = false
}

// 处理鼠标离开事件
const handleMouseLeave = (e) => {
  endDrag(e);
  // 离开画布时结束擦除
  isErasing.value = false
}

// 获取光标样式
const getCursorStyle = () => {
  // 如果正在拖动，显示拖动光标
  if (canvasStore.isDragging) {
    return 'grabbing';
  }
  
  // 根据当前工具返回不同的光标
  const currentTool = canvasStore.currentTool;
  switch (currentTool) {
    case 'pen':
    case 'rect':
    case 'circle':
    case 'triangle':
      return 'crosshair'; // 绘制工具使用十字光标
    case 'picture':
      return 'crosshair';
    case 'eraser':
      return 'cell'; // 橡皮擦工具使用单元格光标
    default:
      return 'default'; // 默认光标
  }
}

// 处理文件上传
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型
  if (!file.type || !file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageUrl = e.target.result;
    console.log('handleFileUpload onload', { imageUrlLength: imageUrl?.length })
    canvasStore.preparePendingImage(imageUrl);
  };
  reader.readAsDataURL(file);
  
  // 重置文件输入，以便下次可以选择相同的文件
  event.target.value = '';
}

// 触发文件选择对话框
const triggerFileInput = () => {
  fileInputRef.value.click();
}


// 同步 Store 视角到 Pixi 容器
const updatePixiViewport = () => {
  if (!stage || !canvasContainerRef.value) return
  
  // 优先使用 app.screen (如果已初始化)，否则使用容器尺寸
  let width = canvasContainerRef.value.clientWidth;
  let height = canvasContainerRef.value.clientHeight;
  
  if (app && app.renderer) { // 检查 renderer 是否存在
      try {
          width = app.screen.width;
          height = app.screen.height;
      } catch (e) {
          console.warn('updatePixiViewport: app.screen 访问失败，回退到容器尺寸', e);
      }
  }

  // Pixi 通过 pivot + position 控制视角（核心：无尺寸限制）
  if (stage.pivot.x !== viewport.value.x || stage.pivot.y !== viewport.value.y) {
    stage.pivot.set(viewport.value.x, viewport.value.y)
  }
  if (stage.scale.x !== viewport.value.scale || stage.scale.y !== viewport.value.scale) {
    stage.scale.set(viewport.value.scale, viewport.value.scale)
  }
  if (stage.position.x !== width / 2 || stage.position.y !== height / 2) {
    stage.position.set(width / 2, height / 2)
  }
}

// 绘制无限网格（示例：基于坐标系统，无尺寸限制）


const drawInfiniteGrid = (container) => {
  const grid = new PIXI.Graphics()
  const gridSize = 50 // 网格间距
  const gridColor = 0xffffff // 网格颜色
  const maxRange = 10000 // 真正无限（可设为较大值优化性能，如100000）
  const thinLineStyle = {
    width: 1, 
    color: gridColor,
    alpha: 0.5 
  };
  grid.setStrokeStyle(thinLineStyle);
  // 绘制水平线
  for (let y = -maxRange; y < maxRange; y += gridSize) {
    grid.moveTo(-maxRange, y)
    grid.lineTo(maxRange, y)
  }
  // 绘制垂直线
  for (let x = -maxRange; x < maxRange; x += gridSize) {
    grid.moveTo(x, -maxRange)
    grid.lineTo(x, maxRange)
  }
  grid.stroke();
  const centerLineStyle = { width: 2, color: 0xbe4a60, alpha: 0.8 };
  grid.stroke(centerLineStyle); 

  // X 轴
  grid.moveTo(-maxRange, 0);
  grid.lineTo(maxRange, 0);
  
  // Y 轴
  grid.moveTo(0, -maxRange);
  grid.lineTo(0, maxRange);

  grid.stroke();

  container.addChild(grid)
}


// 处理鼠标滚轮缩放事件
const handleScale = (e) => {
  const delta = e.deltaY > 0 ? -canvasStore.scalestep : canvasStore.scalestep
  canvasStore.scaleViewport(e, delta)
}


watch(canvasStore.viewport, updatePixiViewport, { deep: true })

// 组件生命周期
onMounted(async () => {
  await initPixi()
  
  // 使用 ResizeObserver 监听容器大小变化，确保布局准确
  if (canvasContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
        resizePixi();
    });
    resizeObserver.observe(canvasContainerRef.value);
  }

  window.addEventListener('resize', resizePixi)
  if (toolbarRef.value) {
    // 调用 Store 的 Action，并将返回的销毁函数保存起来
    uiStore.destroyToolbarDrag = uiStore.initToolbarDrag(toolbarRef.value);
  }
  // 不再直接绑定拖拽事件，使用模板中的事件绑定
  
  // 监听图片工具点击事件
  document.addEventListener('triggerFileInput', triggerFileInput);

})

onUnmounted(() => {
  // 销毁 Pixi 实例
  clearTimeout(dragDebounceTimer);

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  window.removeEventListener('resize', resizePixi)
  if (app) {
    app.destroy(true, { children: true, texture: true });
    // 移除canvas元素（可选）
    pixiMountRef.value?.remove();
  }
  if (uiStore.destroyToolbarDrag) {
    uiStore.destroyToolbarDrag();
  }
  // 移除canvas上的点击事件监听器
  const canvas = pixiMountRef.value;
  if (canvas) {
    canvas.removeEventListener('click', handleCanvasClick);
  }
  if (minimapRef.value) {
    minimapRef.value.destroyMiniMap()
  }
  minimapApp = null
  // 移除图片工具事件监听器
  document.removeEventListener('triggerFileInput', triggerFileInput);

})


const { 
    canvasStyle, 
    scalePercent, 
    minimapViewportStyle,
    viewport
} = storeToRefs(canvasStore)







// 自定义FontAwesome图标组件：用于渲染调色板图标
const FaPalette = defineComponent({
  render() {
    return h(FontAwesomeIcon, {
      icon: faPalette, // 绑定图标对象
      size: '2x', // Fa的内置尺寸关键字，避免校验警告
      class: 'header-icon'
    })
  }
})

function handleCanvasContextMenu(e){
  contextMenuStore.showMenu(e.clientX, e.clientY);
}

</script>

<style scoped>

.floating-minimap {
  position: absolute;
  top: 20px;
  right: 240px; /* 与参数面板保持20px间距 */
  z-index: 90;
}

.main-layout {
  min-height: 100vh;
  overflow: hidden; /* 隐藏全局滚动条 */
}

/* 顶部导航 */
.main-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  z-index: 100; /* 导航栏层级最高 */
  height: 64px;
}

.header-content {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #1890ff;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}



/* 主内容区：画布容器的父容器 */
.main-content {
  background: #f5f7fa;
  padding: 0 !important;
  position: relative;
  height: calc(100vh - 64px - 40px); /* 减去导航+页脚高度 */
}

/* 浮动工具栏 */
.floating-toolbar {
  position: absolute;
  z-index: 90;
  background: #fff;
  border-radius: 8px; /* 和参数面板圆角一致 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); /* 和参数面板阴影一致 */
  padding: 0; /* 去掉外层内边距，避免宽度膨胀 */
  width: 220px; /* 强制和参数面板宽度一致 */
  border: 1px solid #f0f0f0; /* 强制和参数面板边框一致 */
  top: 20px;
  left: 20px;
}

/* 拖动条：紧贴顶部，圆角和容器统一 */
.drag-handle {
  padding: 4px 8px;
  background: #4f677d;
  color: #fff;
  font-size: 12px;
  text-align: center;
  border-radius: 8px 8px 0 0; /* 顶部圆角和容器一致 */
  user-select: none;
  cursor: move;
  margin: 0;
}

/* 内部工具栏卡片：继承容器宽度，加内边距，底部圆角和容器一致 */
:deep(.toolbar-card) {
  width: 100%; /* 继承容器宽度，避免内部组件宽度溢出 */
  padding: 8px;
  border-radius: 0 0 8px 8px; /* 底部圆角和容器一致 */
  border-top: none;
  margin: 0;
  box-shadow: none; /* 去掉内部卡片的额外阴影，和容器阴影统一 */
}

/* 浮动参数面板 */
.floating-param {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 90;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 8px;
  width: 220px;
  border: 1px solid #f0f0f0;
}


:deep(.param-container) { 
  width: 100%;
  padding: 0; 
  border: none; 
  box-shadow: none; 
  margin: 0;
}


.canvas-control {
  margin-top: 8px; /* 把20px改成8px，和工具栏内部的间距一致 */
  padding-top: 8px; /* 把20px改成8px，和工具栏内部的间距一致 */
  border-top: 1px solid #f0f0f0;
}

/* 画布控制按钮的文字和按钮：和工具栏的工具按钮样式对齐 */
.canvas-control p {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px 0; /* 间距改成8px，和工具栏一致 */
}



.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden; 
  position: relative; 
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  /* background: #fff; */
}

#pixi-mount {
  width: 100%;
  height: 100%;
  display: block;
  border: none;
  outline: none;
}

/* 画布内容（可缩放、可拖动） */
.canvas-content {
  width: 100%;
  height: 100%;
  /* 3. 可选：加最小宽高，避免画布为空时看不见 */
  /* min-width: 1800px; */
  /* min-height: 1000px; */
  
  /* position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); 初始居中 */
  /* 核心样式由Pinia的canvasContentStyle提供，这里仅保留基础定位 */
}

/* 画布内容占位符 */
.canvas-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #666;
  text-align: center;
}

.canvas-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #42b983;
}

.canvas-tip {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.canvas-subtip {
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* Pixi挂载点：初始隐藏，后续接入时显示 */


/* 底部页脚 */
.main-footer {
  text-align: center;
  color: #666;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 10px 0;
  height: 40px;
  box-sizing: border-box;
}


/* 整体布局 */
/* .main-layout {
  min-height: 100vh;
  overflow: hidden;
} */

/* 顶部导航 */
/* .main-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
  z-index: 100;
} */

/* .header-content {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #1890ff;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
} */

/* 主内容区 */
/* .main-content {
  background: #f5f7fa;
  height: calc(100vh - 64px - 40px);
  background: #f5f7fa;
  padding: 0 !important;
  position: relative;
}

.floating-toolbar{
  z-index: 90;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
}

.drag-handle{
  padding: 4px 8px;
  background: #1890ff;
  color: #fff;
  font-size: 12px;
  text-align: center;
  border-radius: 4px;
  margin-bottom: 8px;
  user-select: none;
}

.floating-param {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 90;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  width: 220px;
}

.canvas-control {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.canvas-control p {
  font-size: 12px;
  color: #666;
  margin: 0 0 10px 0;
} */



/* .content-container {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  justify-content: center;
} */

/* 画布卡片 */
/* .canvas-card {
  width: 800px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
} */

/* 画布占位符 */
/* .canvas-placeholder {
  text-align: center;
  color: #999;
} */

/* .canvas-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.canvas-tip {
  font-size: 14px;
} */

/* 底部页脚 */
/* .main-footer {
  text-align: center;
  color: #666;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
} */
</style>
