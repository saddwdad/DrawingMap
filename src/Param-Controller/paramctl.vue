<template>
  <div class="param-container">
    <h3 class="param-title">
      <i class="fa-solid fa-sliders"></i> 参数设置
    </h3>
    <!-- 画布缩放控制 -->
    <div class="param-item">
      <label class="param-label">画布缩放</label>
      <div class="slider-group">
        <input 
          type="range" 
          class="param-slider" 
          min="0.1" 
          max="10" 
          step="0.1"
          :value="canvasStore.viewport.scale"
          @input="canvasStore.setScale( Number($event.target.value) )"
        >
        <span class="slider-value">{{ canvasStore.scalePercent }}</span>
      </div>
    </div>
    <!-- 颜色选择 -->
    <div class="param-item">
      <label class="param-label">图形颜色</label>
      <input 
        type="color" 
        class="color-input" 
        :value="canvasStore.currentColor"
        @input="canvasStore.setCurrentColor($event.target.value)"
      >
    </div>
    <!-- 大小滑块 -->
    <div class="param-item">
      <label class="param-label">图形大小</label>
      <div class="slider-group">
        <input 
          type="range" 
          class="param-slider" 
          min="20" 
          max="200" 
          :value="canvasStore.currentSize"
          @input="canvasStore.setCurrentSize(Number($event.target.value))"
        >
        <span class="slider-value">{{ canvasStore.currentSize }}px</span>
      </div>
    </div>
    <!-- 透明度滑块 -->
    <div class="param-item">
      <label class="param-label">透明度</label>
      <div class="slider-group">
        <input 
          type="range" 
          class="param-slider" 
          min="0.1" 
          max="1" 
          step="0.1" 
          :value="canvasStore.currentOpacity"
          @input="canvasStore.setCurrentOpacity(Number($event.target.value))"
        >
        <span class="slider-value">{{ canvasStore.currentOpacity }}</span>
      </div>
    </div>
    <!-- 边框宽度设置 -->
    <div class="param-item">
      <label class="param-label">边框宽度</label>
      <div class="slider-group">
        <input 
          type="range" 
          class="param-slider" 
          min="1" 
          max="20" 
          :value="canvasStore.currentBorderWidth"
          @input="canvasStore.setCurrentBorderWidth(Number($event.target.value))"
        >
        <span class="slider-value">{{ canvasStore.currentBorderWidth }}px</span>
      </div>
    </div>
    <!-- 边框颜色选择 -->
    <div class="param-item">
      <label class="param-label">边框颜色</label>
      <input 
        type="color" 
        class="color-input" 
        :value="canvasStore.currentBorderColor"
        @input="canvasStore.setCurrentBorderColor($event.target.value)"
      >
    </div>
    <!-- 额外功能按钮 -->
    <div class="param-actions">
      <button class="action-btn apply-btn" @click="applyParams">应用参数</button>
      <button class="action-btn reset-btn" @click="resetParams">重置参数</button>
    </div>
  </div>
</template>

<script setup>

import { useCanvasStore } from '@/Main-page/Store/canvasStore'
const canvasStore = useCanvasStore()

// 应用参数（当前实现中参数是实时生效的，此按钮可用于未来扩展）
const applyParams = () => {
  // 目前参数是实时生效的，此方法可用于未来需要批量应用参数的场景
  console.log('参数已应用')
}

// 重置参数
const resetParams = () => {
  canvasStore.setCurrentColor('#42b983')
  canvasStore.setCurrentSize(100)
  canvasStore.setCurrentBorderWidth(2)
  canvasStore.setCurrentBorderColor('#333')
  canvasStore.setCurrentOpacity(1)
}
</script>

<style scoped>
/* 参数面板容器 */
.param-container {
  width: 220px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
}

/* 参数面板标题 */
.param-title {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 参数项容器 */
.param-item {
  margin-bottom: 24px;
}

/* 参数标签 */
.param-label {
  display: block;
  color: #666666;
  font-size: 14px;
  margin-bottom: 8px;
}

/* 颜色选择器 */
.color-input {
  width: 100%;
  height: 40px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  cursor: pointer;
  background-color: transparent;
  padding: 2px;
}

/* 滑块组 */
.slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 参数滑块 */
.param-slider {
  flex: 1;
  height: 6px;
  accent-color: #409eff;
  cursor: pointer;
}

/* 滑块值显示 */
.slider-value {
  width: 60px;
  color: #333333;
  font-size: 12px;
  text-align: right;
}

/* 功能按钮容器 */
.param-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

/* 按钮基础样式 */
.action-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 6px;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

/* 应用按钮 */
.apply-btn {
  background-color: #42b983;
}
.apply-btn:hover {
  background-color: #359469;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.3);
}

/* 重置按钮 */
.reset-btn {
  background-color: #e74c3c;
}
.reset-btn:hover {
  background-color: #c0392b;
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
}
</style>