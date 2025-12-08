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
    <!-- 中部：根据工具动态切换（文本/形状） -->
    <template v-if="canvasStore.currentTool === 'pen'">
      <!-- 字体 -->
      <div class="param-item">
        <label class="param-label">字体</label>
        <input
          type="text"
          class="text-input"
          :value="canvasStore.currentFontFamily"
          @input="canvasStore.setTextProperty('fontFamily', $event.target.value)"
          placeholder="如 Arial, Helvetica, sans-serif"
        >
      </div>
      <!-- 字号 -->
      <div class="param-item">
        <label class="param-label">字号</label>
        <div class="slider-group">
          <input
            type="range"
            class="param-slider"
            min="8"
            max="128"
            :value="canvasStore.currentFontSize"
            @input="canvasStore.setTextProperty('fontSize', Number($event.target.value))"
          >
          <span class="slider-value">{{ canvasStore.currentFontSize }}px</span>
        </div>
      </div>
      <!-- 颜色 -->
      <div class="param-item">
        <label class="param-label">颜色</label>
        <input
          type="color"
          class="color-input"
          :value="canvasStore.currentTextColor"
          @input="canvasStore.setTextProperty('textColor', $event.target.value)"
        >
      </div>
      <!-- 背景色 -->
      <div class="param-item">
        <label class="param-label">背景色</label>
        <div class="slider-group">
          <input
            type="color"
            class="color-input"
            :value="canvasStore.currentTextBackground || '#000000'"
            @input="canvasStore.setTextProperty('textBackground', $event.target.value)"
          >
          <button class="action-btn reset-btn small" @click="canvasStore.setTextProperty('textBackground', null)">无背景</button>
        </div>
      </div>
      <!-- BIUS -->
      <div class="param-item">
        <label class="param-label">BIUS</label>
        <div class="bius-group">
          <button class="toggle-btn" :class="{ active: canvasStore.currentBold }" @click="canvasStore.setTextProperty('bold', !canvasStore.currentBold)">B</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentItalic }" @click="canvasStore.setTextProperty('italic', !canvasStore.currentItalic)">I</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentUnderline }" @click="canvasStore.setTextProperty('underline', !canvasStore.currentUnderline)">U</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentLineThrough }" @click="canvasStore.setTextProperty('lineThrough', !canvasStore.currentLineThrough)">S</button>
        </div>
      </div>
      <!-- 文本内容：替代原弹窗输入 -->
      <div class="param-item">
        <label class="param-label">文本内容</label>
        <textarea
          class="text-area"
          :value="canvasStore.currentTextContent"
          @input="canvasStore.setCurrentTextContent($event.target.value)"
          rows="3"
          placeholder="在此输入文本，点击画布以放置"
        />
      </div>
    </template>
    <template v-else-if="canvasStore.currentTool === 'picture'">
      <div class="param-item">
        <label class="param-label">上传图片</label>
        <input type="file" accept="image/*" @change="onImageFileChange">
      </div>
      <div class="param-item">
        <label class="param-label">滤镜</label>
        <div class="bius-group">
          <button class="toggle-btn" :class="{ active: canvasStore.currentImageFilter === 'none' }" @click="canvasStore.setCurrentImageFilter('none')">无</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentImageFilter === 'green' }" @click="canvasStore.setCurrentImageFilter('green')">绿色</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentImageFilter === 'warm' }" @click="canvasStore.setCurrentImageFilter('warm')">暖色</button>
          <button class="toggle-btn" :class="{ active: canvasStore.currentImageFilter === 'cool' }" @click="canvasStore.setCurrentImageFilter('cool')">冷色</button>
        </div>
      </div>
      <div class="param-item">
        <label class="param-label">图像大小</label>
        <div class="slider-group">
          <input type="range" class="param-slider" min="0.1" max="3" step="0.1" :value="canvasStore.currentImageScale" @input="canvasStore.setCurrentImageScale(Number($event.target.value))">
          <span class="slider-value">{{ Math.round(canvasStore.currentImageScale * 100) }}%</span>
        </div>
      </div>
    </template>
    <template v-else>
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
    </template>
    <!-- 额外功能按钮 -->
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
    </template>
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
  canvasStore.resetTextProperties()
  canvasStore.setCurrentImageScale(1)
  canvasStore.setCurrentImageFilter('none')
}

const onImageFileChange = (event) => {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  if (!file.type || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const imageUrl = e.target?.result
    if (imageUrl) canvasStore.setCurrentImageUrl(imageUrl)
  }
  reader.readAsDataURL(file)
  event.target.value = ''
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

/* 额外：文本工具样式 */
.text-input {
  width: 100%;
  height: 36px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
}

.text-area {
  width: 100%;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  resize: vertical;
}

.bius-group {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  width: 36px;
  height: 28px;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
}
.toggle-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.small {
  padding: 6px 8px;
  font-size: 12px;
}
</style>

