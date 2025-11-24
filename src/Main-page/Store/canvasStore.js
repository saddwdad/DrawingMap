// src/stores/canvasStore.js
import { defineStore } from 'pinia'

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    viewport: {
      x: 0,
      y: 0,
      scale: 1
    },
    isDragging: false, // 是否正在拖动内容
    dragStart: { x: 0, y: 0 },
    bgColor: '#1a1a1a', // 内容背景色
    borderColor: '#333', // 内容边框色
    scalestep: 0.1,
    scaleLimits : {min: 0.1, max: 10},
    minimap: {
      scale: 0.1,
      viewportSize: { width: 0, height: 0 }
    },
    
    

  }),
  getters: {
    viewportTransform(state){
      return {
        x: state.viewport.x,
        y: state.viewport.y,
        scale: state.viewport.scale
      }
    },

    scalePercent(state){
      return Math.round(state.viewport.scale*100)+'%'
    }
  },
  actions: {
    initViewportSize(width, height) {
      this.minimap.viewportSize = { width, height }
    },

    startDrag(e) {
      this.isDragging = true
      this.dragStart = { x:e.clientX, y:e.clientY }
    },



    dragViewport(e) {
      if(!this.isDragging) return
      const dx = (e.clientX - this.dragStart.x) / this.viewport.scale
      const dy = (e.clientY - this.dragStart.y) / this.viewport.scale
      this.viewport.x -= dx
      this.viewport.y -= dy
      this.dragStart = {x:e.clientX, y:e.clientY}
    },

    endDrag(){
      this.isDragging = false
    },

// src/stores/canvasStore.js actions
// ...
  scaleViewport(e, delta) {
    e.preventDefault()
    const newScale = Math.max(
    this.scaleLimits.min, 
    Math.min(this.scaleLimits.max, this.viewport.scale + delta)
    )

    if(newScale === this.viewport.scale) return

    const rect = e.target.getBoundingClientRect()
    const mouseX = e.clientX - rect.left // 鼠标在容器内的X坐标
    const mouseY = e.clientY - rect.top // 鼠标在容器内的Y坐标

    // 容器中心点 (Stage的 position 坐标)
    const centerX = this.minimap.viewportSize.width / 2 
    const centerY = this.minimap.viewportSize.height / 2
    
    // 1. 计算鼠标相对于 Stage 中心点的偏移 (屏幕坐标)
    const screenX = mouseX - centerX
    const screenY = mouseY - centerY

    // 2. 将屏幕偏移转换为 Pixi 世界坐标
    const worldX = screenX / this.viewport.scale + this.viewport.x
    const worldY = screenY / this.viewport.scale + this.viewport.y
    
    // 3. 更新缩放比例
    this.viewport.scale = newScale

    // 4. 应用新的缩放比例，计算新的视口坐标
    // 新的视口 X = 鼠标的世界X - 鼠标的屏幕X / 新缩放
    this.viewport.x = worldX - screenX / newScale
    this.viewport.y = worldY - screenY / newScale


},
  setScale(newScale) {
      // 确保值在限制范围内
      const scale = Math.max(
        this.scaleLimits.min, 
        Math.min(this.scaleLimits.max, newScale)
      )
      this.viewport.scale = scale
    },


  resetCanvas(){
      this.viewport.x = 0
      this.viewport.y = 0
      this.viewport.scale = 1
      this.isDragging = false
    },
  },

  persist: {
    enabled: true,
    paths: ['viewport']
  }
})