// src/stores/canvasStore.js
import { defineStore } from 'pinia'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    // 画布内容的核心状态
    scale: 1, // 缩放比例（默认1倍，无极缩放）
    offset: { x: 0, y: 0 }, // 内容偏移位置（拖动后的坐标）
    isDragging: false, // 是否正在拖动内容
    // 拖拽临时变量（记录鼠标起始位置）
    dragStart: { x: 0, y: 0 },
    // 画布内容的基础配置（纯UI）
    contentSize: { width: 1800, height: 1000 }, // 内容原始尺寸（后续可动态修改）
    bgColor: '#1a1a1a', // 内容背景色
    borderColor: '#333', // 内容边框色
    transformOrigin: 'center center'
  }),
  getters: {
    // 计算画布内容的样式（核心：scale+translate实现缩放和拖动）
    canvasContentStyle(state) {
      return {
        width: `${state.contentSize.width}px`,
        height: `${state.contentSize.height}px`,
        backgroundColor: state.bgColor,
        border: `2px solid ${state.borderColor}`,
        borderRadius: '8px',
        position: 'absolute',
        top: '0%', 
        left: '0%', 
        transform: `translate(${state.offset.x}px, ${state.offset.y}px) scale(${state.scale})`,
        transformOrigin: 'center center', 
        cursor: state.isDragging ? 'grabbing' : 'grab',
        transition: state.isDragging ? 'none' : 'transform 0.1s ease' // 缩放时平滑过渡
      }
    },
    // 计算缩放百分比（用于页面显示）
    scalePercent(state) {
      return Math.round(state.scale * 100) + '%'
    }
  },
  actions: {
    /**
     * 初始化画布内容的拖拽（核心方法：处理鼠标事件）
     * @param {HTMLElement} contentEl 画布内容的DOM元素
     */

    setContentSize(width, height) {
    this.contentSize = { width, height }
    },

    initContentDrag(contentEl) {
      if (!contentEl) return

      // 鼠标按下：记录起始位置
      const handleMouseDown = (e) => {
        this.isDragging = true
        this.dragStart = { x: e.clientX, y: e.clientY }
        e.preventDefault()
      }

      // 鼠标移动：计算偏移（仅拖拽时生效）
      const handleMouseMove = (e) => {
        if (!this.isDragging) return
        const dx = e.clientX - this.dragStart.x
        const dy = e.clientY - this.dragStart.y
        // 更新内容偏移（基于当前位置累加）
        this.offset = {
          x: this.offset.x + dx,
          y: this.offset.y + dy
        }
        // 更新鼠标起始位置（实现连续拖动）
        this.dragStart = { x: e.clientX, y: e.clientY }
      }

      // 鼠标松开：结束拖拽
      const handleMouseUp = () => {
        this.isDragging = false
      }

      // 绑定事件到内容元素
      contentEl.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // 返回销毁函数（防止内存泄漏）
      return () => {
        contentEl.removeEventListener('mousedown', handleMouseDown)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    },

    /**
     * 处理滚轮缩放（无极缩放）
     * @param {WheelEvent} e 滚轮事件
     */
    handleWheelScale(e) {
      e.preventDefault()
      // 计算缩放增量（滚轮向上放大，向下缩小）
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      // 限制缩放范围（0.2-5倍，可自定义）
      const newScale = Math.max(0.2, Math.min(5, this.scale + delta))
      // 基于鼠标位置缩放（中心缩放，更符合交互习惯）
      const rect = e.target.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      // 计算偏移修正（保证缩放后鼠标位置不变）
      this.offset = {
        x: mouseX - (mouseX - this.offset.x) * (newScale / this.scale),
        y: mouseY - (mouseY - this.offset.y) * (newScale / this.scale)
      }
      // 更新缩放比例
      this.scale = newScale
    },

    /**
     * 重置画布内容状态
     */
    resetCanvas() {
      this.scale = 1
      this.offset = { x: 0, y: 0 }
      this.isDragging = false
    }
  },
  // 持久化核心状态（刷新后保留缩放和偏移）
  persist: {
    enabled: true,
    paths: ['scale', 'offset']
  }
})