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
          <a-button size="small" type="primary" @click="canvasStore.resetCanvas()">重置画布</a-button>
        </div>
      </div>

      <!-- 核心：画布容器（固定铺满屏幕，位置不动） -->
      <div class="canvas-container" ref="canvasContainerRef" @wheel="canvasStore.handleWheelScale($event)">
        <!-- 画布内容（可缩放、可拖动，样式由canvasStore管理） -->
        <div class="canvas-content" ref="canvasContentRef" :style="canvasStore.canvasContentStyle">
          <!-- 内容占位：模拟Pixi画布的内容，后续替换为Pixi挂载点 -->
          <div class="canvas-placeholder">
            <i class="fa-solid fa-paintbrush canvas-icon"></i>
            <p class="canvas-tip">画布内容区（滚轮缩放 | 鼠标拖动）</p>
            <p class="canvas-subtip">缩放后可拖动查看不同区域</p>
          </div>
          <!-- 预留Pixi挂载点：后续接入时隐藏占位符，显示此节点 -->
          <div id="pixi-mount-point" class="pixi-mount"></div>
        </div>
      </div>
    </a-layout-content>

    <!-- 底部页脚 -->
    <a-layout-footer class="main-footer">
      ©2025 Pixi + Vue + Ant Design Vue 画布编辑器 | 纯UI版
    </a-layout-footer>
  </a-layout>
</template>

<script setup>
import { defineComponent, h, createVNode, ref, onMounted, onUnmounted } from 'vue'
import { FontAwesomeIcon  } from '@fortawesome/vue-fontawesome'
import { faPalette } from '@fortawesome/free-solid-svg-icons'
// 引入子组件
import toolbar from '@/Toolbar/toolbar.vue'
import paramctl from '@/Param-Controller/paramctl.vue'

// 引入AntD图标
import { SaveOutlined, ShareAltOutlined } from '@ant-design/icons-vue'

import { useUiStore } from '@/Stores/UIStore'
import { useCanvasStore } from '@/Stores/canvasStore'
const uiStore = useUiStore()
const canvasStore = useCanvasStore()

// DOM引用
const toolbarRef = ref(null)
const canvasContainerRef = ref(null)
const canvasContentRef = ref(null)

// 销毁函数
let destroyToolbarDrag = null
let destroyContentDrag = null

// 组件挂载：初始化交互
onMounted(() => {
  // 初始化工具栏拖拽
  if (canvasContainerRef.value) {
    const { width, height } = canvasContainerRef.value.getBoundingClientRect()
    canvasStore.setContentSize(width, height) // 调用新增的方法
  }
  
  if (toolbarRef.value) {
    destroyToolbarDrag = uiStore.initToolbarDrag(toolbarRef.value)
  }
  // 初始化画布内容拖拽
  if (canvasContentRef.value) {
    destroyContentDrag = canvasStore.initContentDrag(canvasContentRef.value)
  }
})

// 组件卸载：销毁事件
onUnmounted(() => {
  if (destroyToolbarDrag) destroyToolbarDrag()
  if (destroyContentDrag) destroyContentDrag()
})



const FaPalette = defineComponent({
  render() {
    return h(FontAwesomeIcon, {
      icon: faPalette, // 绑定图标对象
      size: '2x', // Fa的内置尺寸关键字，避免校验警告
      class: 'header-icon'
    })
  }
})

// 后续逻辑占位：引入Pinia仓库、初始化Pixi
// import { useToolStore } from '@/stores/toolStore'
// import * as PIXI from 'pixi.js'
// const toolStore = useToolStore()
</script>

<style scoped>

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
  background: #fff;
}

/* 画布内容（可缩放、可拖动） */
.canvas-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 初始居中 */
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
.pixi-mount {
  width: 100%;
  height: 100%;
  display: none;
}

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