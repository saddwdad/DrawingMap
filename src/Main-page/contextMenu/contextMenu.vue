<template>
  <div
    class="context-menu"
    :style="{ left: `${contextMenuStore.left}px`, top: `${contextMenuStore.top}px` }"
    v-if="contextMenuStore.show"
    @mousedown.stop.prevent
  >
    <!-- 直接引入 History 组件，不传递任何事件 -->
    <History />
    <!-- 其他菜单项可以保留，但要和 History 组件逻辑分开 -->
    <!-- <div class="menu-divider"></div>
    <div
      class="menu-item"
      :class="{ disabled: !canvasStore.selectedObject }"
      @click="handleDeleteSelected"
    >
      删除选中对象
    </div>
    <div class="menu-item" @click="handleClearCanvas">
      清空画布
    </div> -->
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useContextMenuStore } from '@/Main-page/contextMenu/contextMenu'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'

import History from '@/History/History.vue' // 引入修复后的 History 组件

// 只关联需要的仓库
const contextMenuStore = useContextMenuStore()
const canvasStore = useCanvasStore()

// 单独处理删除选中对象（和历史组件逻辑分离）
const handleDeleteSelected = () => {
  if (canvasStore.selectedObject) {
    canvasStore.renderer?.removeShape(canvasStore.selectedObject);
    canvasStore.objects = canvasStore.objects.filter(obj => obj !== canvasStore.selectedObject);
    canvasStore.clearSelection();
    contextMenuStore.hideMenu();
  }
}



// 单独处理清空画布
const handleClearCanvas = () => {
  canvasStore.clearCanvas();
  contextMenuStore.hideMenu();
}

// 点击空白处关闭菜单（保留原有逻辑）
function handleDocumentClick() {
  contextMenuStore.hideMenu();
}
document.addEventListener('click', handleDocumentClick);

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  width: 140px;
  background: #2d2d2d;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  padding: 6px 0;
  color: #fff;
  user-select: none;
}

/* 注意：这里的 .menu-item 样式只作用于 contextMenu 自身的菜单项，不影响 History 组件内部 */
.menu-item {
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover:not(.disabled) {
  background: #4a4a4a;
}

.menu-item.disabled {
  color: #888;
  cursor: not-allowed;
}

.menu-divider {
  height: 1px;
  background: #444;
  margin: 6px 0;
}
</style>