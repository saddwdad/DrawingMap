// src/stores/uiStore.js
import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    // 工具栏状态
    toolbar: {
      position: { left: 20, top: 20 }, // 工具栏位置
      isDragging: false, // 是否正在拖拽
      size: { width: 220, height: 'auto' } // 工具栏尺寸（适配你的工具栏组件）
    },
    // 浮动参数控制栏状态
    floatingParam: {
      position: { left: 0, top: 0 }, // 初始位置
      isDragging: false, // 是否正在拖拽
      size: { width: 220, height: 'auto' } // 尺寸
    },
    // 画布UI状态（纯视觉配置）
    canvas: {
      bgColor: '#1a1a1a', // 画布背景色
      border: '1px solid #333', // 画布边框
      borderRadius: '8px', // 画布圆角
      placeholderShow: true, // 占位符是否显示
      mountPointShow: false // Pixi挂载点是否显示
    },
    // 拖拽临时变量（内部使用，不持久化）
    dragTemp: {
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0
    }
  }),
  getters: {
    // 计算工具栏的样式对象（供页面直接使用）
    toolbarStyle(state) {
      return {
        left: `${state.toolbar.position.left}px`,
        top: `${state.toolbar.position.top}px`,
        width: `${state.toolbar.size.width}px`,
        height: state.toolbar.size.height,
        opacity: state.toolbar.isDragging ? 0.8 : 1,
        cursor: state.toolbar.isDragging ? 'grabbing' : 'move'
      }
    },
    // 计算浮动参数控制栏的样式对象
    floatingParamStyle(state) {
      return {
        left: `${state.floatingParam.position.left}px`,
        top: `${state.floatingParam.position.top}px`,
        width: `${state.floatingParam.size.width}px`,
        height: state.floatingParam.size.height,
        opacity: state.floatingParam.isDragging ? 0.8 : 1,
        cursor: state.floatingParam.isDragging ? 'grabbing' : 'move'
      }
    },
    // 计算画布的样式对象（供页面直接使用）
    canvasStyle(state) {
      return {
        backgroundColor: state.canvas.bgColor,
        border: state.canvas.border,
        borderRadius: state.canvas.borderRadius
      }
    }
  },
  actions: {
    /**
     * 初始化工具栏拖拽（核心方法：封装所有拖拽逻辑）
     * @param {HTMLElement} toolbarEl 工具栏DOM元素
     */
    initToolbarDrag(toolbarEl) {
      if (!toolbarEl) return

      // 鼠标按下：开始拖拽
      const handleMouseDown = (e) => {
        // 只有当点击的是拖动手柄或工具栏本身（不包括内部按钮）时才开始拖动
        if (e.target.classList.contains('drag-handle') || e.target === toolbarEl) {
          this.toolbar.isDragging = true
          this.dragTemp.startX = e.clientX
          this.dragTemp.startY = e.clientY
          this.dragTemp.startLeft = this.toolbar.position.left
          this.dragTemp.startTop = this.toolbar.position.top
          e.preventDefault()
          // 阻止事件冒泡，避免与其他事件冲突
          e.stopPropagation()
        }
      }

      // 鼠标移动：更新位置
      const handleMouseMove = (e) => {
        if (!this.toolbar.isDragging) return
        const dx = e.clientX - this.dragTemp.startX
        const dy = e.clientY - this.dragTemp.startY
        // 限制工具栏在屏幕内
        const newLeft = Math.max(0, Math.min(this.dragTemp.startLeft + dx, window.innerWidth - this.toolbar.size.width))
        const newTop = Math.max(0, Math.min(this.dragTemp.startTop + dy, window.innerHeight - 100)) // 100为页脚+预留高度
        this.toolbar.position = { left: newLeft, top: newTop }
      }

      // 鼠标松开：结束拖拽
      const handleMouseUp = () => {
        if (this.toolbar.isDragging) {
          this.toolbar.isDragging = false
        }
      }

      // 绑定事件
      toolbarEl.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // 返回销毁函数（供页面组件卸载时调用）
      return () => {
        toolbarEl.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    },
    /**
     * 初始化浮动参数控制栏拖拽
     * @param {HTMLElement} paramEl 浮动参数控制栏DOM元素
     */
    initFloatingParamDrag(paramEl) {
      if (!paramEl) return

      // 鼠标按下：开始拖拽
      const handleMouseDown = (e) => {
        // 只有当点击的是拖动手柄或面板本身时才开始拖动
        if (e.target.classList.contains('drag-handle') || e.target === paramEl) {
          this.floatingParam.isDragging = true
          this.dragTemp.startX = e.clientX
          this.dragTemp.startY = e.clientY
          this.dragTemp.startLeft = this.floatingParam.position.left
          this.dragTemp.startTop = this.floatingParam.position.top
          e.preventDefault()
          // 阻止事件冒泡，避免与其他事件冲突
          e.stopPropagation()
        }
      }

      // 鼠标移动：更新位置
      const handleMouseMove = (e) => {
        if (!this.floatingParam.isDragging) return
        const dx = e.clientX - this.dragTemp.startX
        const dy = e.clientY - this.dragTemp.startY
        // 限制面板在屏幕内
        const newLeft = Math.max(0, Math.min(this.dragTemp.startLeft + dx, window.innerWidth - this.floatingParam.size.width))
        const newTop = Math.max(0, Math.min(this.dragTemp.startTop + dy, window.innerHeight - 100)) // 100为页脚+预留高度
        this.floatingParam.position = { left: newLeft, top: newTop }
      }

      // 鼠标松开：结束拖拽
      const handleMouseUp = () => {
        if (this.floatingParam.isDragging) {
          this.floatingParam.isDragging = false
        }
      }

      // 绑定事件
      paramEl.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // 返回销毁函数（供页面组件卸载时调用）
      return () => {
        paramEl.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    },
    /**
     * 切换画布占位符显隐（后续接入Pixi时调用）
     * @param {boolean} show 
     */
    toggleCanvasPlaceholder(show) {
      this.canvas.placeholderShow = show
      this.canvas.mountPointShow = !show
    },
    /**
     * 重置工具栏位置
     */
    resetToolbarPosition() {
      this.toolbar.position = { left: 20, top: 20 }
    }
  },
  // 仅持久化工具栏位置和浮动参数控制栏位置（UI状态），临时变量不持久化
  persist: {
    enabled: true,
    paths: ['toolbar.position', 'canvas', 'floatingParam.position']
  }
})