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
      <a-space direction="horizontal" size="large" class="content-container">
        <!-- 工具栏组件 -->
        <toolbar />

        <!-- 画布容器：用AntD的Card实现 -->
        <a-card class="canvas-card" bordered>
          <div class="canvas-placeholder">
            
            <p class="canvas-tip">画布区域（后续加载Pixi.js）</p>
          </div>
        </a-card>

        <!-- 参数面板组件 -->
        <paramctl />
      </a-space>
    </a-layout-content>

    <!-- 底部页脚 -->
    <a-layout-footer class="main-footer">
      ©2025 Pixi + Vue + Ant Design Vue 画布编辑器 | 纯UI版
    </a-layout-footer>
  </a-layout>
</template>

<script setup>
import { defineComponent, h, createVNode } from 'vue'
import { FontAwesomeIcon  } from '@fortawesome/vue-fontawesome'
import { faPalette } from '@fortawesome/free-solid-svg-icons'
// 引入子组件
import toolbar from '@/Toolbar/toolbar.vue'
import paramctl from '@/Param-Controller/paramctl.vue'

// 引入AntD图标
import { SaveOutlined, ShareAltOutlined, PictureOutlined } from '@ant-design/icons-vue'

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
/* 整体布局 */
.main-layout {
  min-height: 100vh;
}

/* 顶部导航 */
.main-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0;
}

.header-content {
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
}

/* 主内容区 */
.main-content {
  background: #f5f7fa;
  padding: 24px;
}

.content-container {
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  justify-content: center;
}

/* 画布卡片 */
.canvas-card {
  width: 800px;
  height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

/* 画布占位符 */
.canvas-placeholder {
  text-align: center;
  color: #999;
}

.canvas-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.canvas-tip {
  font-size: 14px;
}

/* 底部页脚 */
.main-footer {
  text-align: center;
  color: #666;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}
</style>