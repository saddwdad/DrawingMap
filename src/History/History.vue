<template>
  <!-- 独立的历史功能菜单项 -->
  <div class="history-menu-group">
    <!-- 撤销 -->
    <div
      class="menu-item"
      :class="{ disabled: !historyStore.canUndo }"
      @mousedown="() => console.log('撤销按钮：鼠标按下')"
      @mouseup="() => console.log('撤销按钮：鼠标松开')"
      @click="handleUndo" 
    >
      撤销 (Ctrl+Z)
    </div>
    <!-- 重做 -->
    <div
      class="menu-item"
      :class="{ disabled: !historyStore.canRedo }"
      @click="handleRedo" 
    >
      重做 (Ctrl+Alt+Z)
    </div>
    <!-- 复制 -->
    <div class="menu-item"
        :class="{ disabled: !canvasStore.renderer.selectedObjects.length>0}"
        @click="handleCopy"
    >
      复制 (Ctrl+C)
    </div>
    <!-- 粘贴 -->
    <div class="menu-item"
        :class="{ disabled: !historyStore.canPaste}"
        @click="handlePaste"
    >
      粘贴 (Ctrl+V)
    </div>
    <!-- 清空历史 -->
    <div class="menu-divider"></div>
    <div
      class="menu-item"
      :class="{ disabled: !historyStore.undoCount && !historyStore.redoCount }"
      @click="handleClearHistory"
    >
      清空历史记录
    </div>
  </div>
</template>

<script setup>
import { useHistoryStore } from '@/History/History'
import { useContextMenuStore } from '@/Main-page/contextMenu/contextMenu'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'
import { onMounted, onUnmounted, ref } from 'vue'
const canvasStore = useCanvasStore()
const historyStore = useHistoryStore()
const contextMenuStore = useContextMenuStore()
// History.vue 顶层
const mouseScreenX = ref(0);
const mouseScreenY = ref(0);


const handleUndo = () => {
  console.log("=== 撤销按钮事件链路 ===")
  console.log("1. 鼠标按下日志（已触发）")
  console.log("2. historyStore 实例：", historyStore) // 确认实例是否正确
  console.log("3. undoStack 长度：", historyStore.undoStack.length) // 关键：是否有记录
  console.log("4. canUndo 状态：", historyStore.canUndo) // 关键：是否为 true
  console.log("5. undoStack 内容：", historyStore.undoStack) // 查看是否有操作对象
  if (historyStore.canUndo) {
    console.log("点击了撤销按钮，触发 historyStore.undo()") // 新增日志
    historyStore.undo()
    contextMenuStore.hideMenu()
  } else {
    console.log("撤销按钮不可点击（无历史记录）")
  }
}

// 重做操作：直接调用
const handleRedo = () => {
  if (historyStore.canRedo) {
    console.log("点击了重做按钮，触发 historyStore.redo()") // 新增日志
    historyStore.redo()
    contextMenuStore.hideMenu()
  } else {
    console.log("重做按钮不可点击（无重做记录）")
  }
}

// 清空历史
const handleClearHistory = () => {
  console.log("点击了清空历史按钮")
  historyStore.clearHistory()
  contextMenuStore.hideMenu()
}

//复制
const handleCopy = (display) => {
  const selectedObjects = canvasStore.renderer?.selectedObjects;
  if(selectedObjects && selectedObjects.length > 0){
    historyStore.copyItem(selectedObjects)
    contextMenuStore.hideMenu()
    
  }
}
//粘贴
const handlePaste = () => {
  if(!historyStore.canPaste){
    console.log('无可粘贴内容')
    return
  }
  const screenPos = { x: mouseScreenX.value, y: mouseScreenY.value };
  const stagePos = canvasStore.renderer.stage.toLocal(screenPos);
  historyStore.pasteItem(stagePos.x, stagePos.y);
  contextMenuStore.hideMenu();
}

const updateMousePos = (e) => {
    mouseScreenX.value = contextMenuStore.left 
    mouseScreenY.value = contextMenuStore.top
};
onMounted(() => {
    window.addEventListener('mousemove', updateMousePos);
});


onUnmounted(() => {
    window.removeEventListener('mousemove', updateMousePos);
});
</script>

<style>
.history-menu-group {
  width: 100%;
}

.menu-item {
  padding: 10px 18px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: #ffffff;
}

.menu-item:hover:not(.disabled) {
  background-color: #4a4a4a;
}

.menu-item.disabled {
  color: #888888;
  cursor: not-allowed;
}

.menu-divider {
  height: 1px;
  background-color: #444444;
  margin: 6px 0;
}
</style>