<template>
  <a-card title="画布工具" class="toolbar-card" bordered>
    <!-- 工具按钮组：用Space实现自动间距，方向为vertical+wrap，实现2列布局 -->
    <a-space warp:size="10" class="tool-space">
      <a-button
        v-for="tool in toolList"
        :key="tool.type"
        class="tool-btn"
        :type="tool.type === 'Currenttool' ? 'primary' : 'default'" 
        :icon="createVNode(tool.icon, {class: 'uniformIcon'})" 
        block
        shape="round"
      >
        {{ tool.name }}
      </a-button>
    </a-space>
  </a-card>
</template>

<script setup>

import { ref, createVNode, h } from 'vue' 
import {EditOutlined, DeleteOutlined, ReloadOutlined, PictureOutlined} from '@ant-design/icons-vue'
import circle from '@/icons/circle.vue'
import square from '@/icons/square.vue'
import triangle from '@/icons/triangle.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faEraser } from '@fortawesome/free-solid-svg-icons'

const FaEraser = () => {
  // h(组件, 组件属性, 子节点)
  return h(FontAwesomeIcon, {
    icon: faEraser, // 绑定橡皮擦图标对象
    size: '1x',     // 图标大小，和Antd图标对齐
    class: 'tool-icon' // 统一的样式类名
  })
}

const toolList = [
  { type: 'pen', name: '画笔', icon: EditOutlined },
  { type: 'rect', name: '矩形', icon: square },
  { type: 'circle', name: '圆形', icon: circle },
  { type: 'triangle', name: '三角形', icon: triangle},
  { type: 'picture', name: '图像', icon: PictureOutlined},
  { type: 'eraser', name: '橡皮擦', icon: FaEraser },
  { type: 'clear', name: '清除画布', icon: DeleteOutlined },
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