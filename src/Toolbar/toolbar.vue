<template>
  <a-card title="画布工具" class="toolbar-card" bordered>
    <!-- 工具按钮组：用Space实现自动间距，方向为vertical+wrap，实现2列布局 -->
    <a-space warp:size="10" class="tool-space">
      <a-button
        v-for="tool in toolList"
        :key="tool.type"
        class="tool-btn"
        :type="tool.type === currentTool ? 'primary' : 'default'" 
        :icon="createVNode(tool.icon, {class: 'uniformIcon'})" 
        block
        shape="round"
        @click="(e) => handleToolClick(tool.type, e)"
      >
        {{ tool.name }}
      </a-button>
    </a-space>
  </a-card>
</template>

<script setup>

import { ref, createVNode, h, computed } from 'vue' 
import {EditOutlined, DeleteOutlined, ReloadOutlined, PictureOutlined, SelectOutlined} from '@ant-design/icons-vue'
import circle from '@/icons/circle.vue'
import square from '@/icons/square.vue'
import triangle from '@/icons/triangle.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faEraser } from '@fortawesome/free-solid-svg-icons'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'

const canvasStore = useCanvasStore()
// 直接从canvasStore获取当前工具，而不是使用本地ref
const currentTool = computed(() => canvasStore.currentTool)

const FaEraser = () => {
  // h(组件, 组件属性, 子节点)
  return h(FontAwesomeIcon, {
    icon: faEraser, // 绑定橡皮擦图标对象
    size: '1x',     // 图标大小，和Antd图标对齐
    class: 'tool-icon' // 统一的样式类名
  })
}

const toolList = [
  // 新增：选择工具，用于点击对象进入编辑
  { type: 'select', name: '选择', icon: SelectOutlined },
  { type: 'pen', name: '文本', icon: EditOutlined },
  { type: 'rect', name: '矩形', icon: square },
  { type: 'circle', name: '圆形', icon: circle },
  { type: 'triangle', name: '三角形', icon: triangle},
  { type: 'picture', name: '图像', icon: PictureOutlined},
  { type: 'eraser', name: '橡皮擦', icon: FaEraser },
  { type: 'clear', name: '清除画布', icon: DeleteOutlined },
  { type: 'reset', name: '重置画布', icon: ReloadOutlined },
]

const handleToolClick = (toolType, e) => {
  // 阻止事件冒泡，避免影响工具栏拖动功能
  e.stopPropagation();
  
  console.log('工具栏点击:', toolType);
  // 直接调用canvasStore的方法设置当前工具，不需要手动更新currentTool
  // currentTool是computed属性，会自动从canvasStore中获取值
  canvasStore.setCurrentTool(toolType)
  console.log('当前工具已设置:', canvasStore.currentTool);
  
  // 处理特殊工具
  if (toolType === 'clear') {
    canvasStore.clearCanvas()
  } else if (toolType === 'reset') {
    canvasStore.resetCanvas()
  } else if (toolType === 'picture') {
    
  } else if (toolType === 'rect' || toolType === 'circle' || toolType === 'triangle') {
    canvasStore.preparePending(toolType)
  } else if (toolType === 'pen') {
    // 文本工具：使用参数面板中的文本内容，不再弹窗
    canvasStore.preparePendingText(canvasStore.currentTextContent)
  }
}
</script>

<style scoped>
/* 工具栏卡片样式 */
.toolbar-card {
  width: 220px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

/* 工具按钮容器：实现1列布局 */
.tool-space {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  width: 100%;
}

/* 工具按钮样式 */
.tool-btn {
  height: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 0;
}

/* 图标样式 */
:deep(.uniform-icon),
:deep(.anticon),
:deep(.svg-inline--fa) {
  font-size: 18px;
  width: 18px;
  height: 18px;
  display: inline-block;
  margin: 0; /* 清除默认margin */
  vertical-align: middle; /* 图标自身垂直居中 */
  line-height: 1; /* 消除行高干扰 */
}

:deep(.ant-btn-content span) {
  line-height: 1; /* 文字行高和图标一致 */
  display: inline-block;
  vertical-align: middle;
}
</style>
