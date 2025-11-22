<template>
  <a-card title="画布工具" class="toolbar-card" bordered>
    <!-- 工具按钮组：用Space实现自动间距，方向为vertical+wrap，实现2列布局 -->
    <a-space direction="vertical" wrap :size="12" class="tool-space">
      <a-button
        v-for="tool in toolList"
        :key="tool.type"
        class="tool-btn"
        :type="tool.type === 'Currenttool' ? 'primary' : 'default'" 
        :icon="createVNode(tool.icon)" 
        block
        shape="round"
      >
        {{ tool.name }}
      </a-button>
    </a-space>
  </a-card>
</template>

<script setup>
import { createVNode } from 'vue'
import {PenFilled, SquareFilled, CircleFilled, EraserFilled, DeleteFilled, ReloadOutlined} from '@ant-design/icons-vue'

const toolList = [
  { type: 'pen', name: '画笔', icon: PenFilled },
  { type: 'rect', name: '矩形', icon: SquareFilled },
  { type: 'circle', name: '圆形', icon: CircleFilled },
  { type: 'triangle', name: '三角形', icon: TriangleUpFilled},
  { type: 'eraser', name: '橡皮擦', icon: EraserFilled },
  { type: 'clear', name: '清除画布', icon: DeleteFilled },
  { type: 'reset', name: '重置画布', icon: ReloadOutlined },
]

// 后续逻辑占位：引入Pinia仓库
// import { useToolStore } from '@/stores/toolStore'
// const toolStore = useToolStore()
</script>

<style scoped>
/* 工具栏卡片样式 */
.toolbar-card {
  width: 220px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

/* 工具按钮容器：实现2列布局 */
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
}

/* 图标样式 */
:deep(.anticon) {
  font-size: 18px;
  margin-bottom: 4px;
}
</style>