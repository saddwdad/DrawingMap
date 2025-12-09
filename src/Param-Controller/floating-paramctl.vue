<template>
  <div 
    class="floating-param-content"
  >
    <!-- 浮动参数面板标题 -->
    <h3 class="param-title">
      <i class="fa-solid fa-sliders"></i> 属性编辑
    </h3>
    
    <!-- 针对选中对象类型显示不同的参数编辑选项 -->
    <template v-if="selectedObject._shape.type === 'text'">
      <!-- 文本内容 -->
      <div class="param-item">
        <label class="param-label">文本内容</label>
        <textarea
          class="text-area"
          :value="textContent"
          @input="updateTextContent($event.target.value)"
          rows="2"
          placeholder="输入文本内容"
        />
      </div>
      <!-- 字体 -->
      <div class="param-item">
        <label class="param-label">字体</label>
        <input
          type="text"
          class="text-input"
          :value="fontFamily"
          @input="updateTextProperty('font-family', $event.target.value)"
          placeholder="如 Arial"
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
            :value="fontSize"
            @mousedown="handleSliderDragStart('font-size', selectedObject)"
            @input="handleSliderInput('font-size', Number($event.target.value))"
            @mouseup="handleSliderDragEnd('font-size', Number($event.target.value))"
          >
          <span class="slider-value">{{ fontSize }}px</span>
        </div>
      </div>
      <!-- 颜色 -->
      <div class="param-item">
        <label class="param-label">颜色</label>
        <input
          type="color"
          class="color-input"
          :value="color"
          @mousedown="handleSliderDragStart('color', selectedObject)"
          @input="handleSliderInput('color', $event.target.value)"
          @change="handleSliderDragEnd('color', $event.target.value)"
        >
      </div>
      <!-- 背景色 -->
      <div class="param-item">
        <label class="param-label">背景色</label>
        <div class="slider-group">
          <input
            type="color"
            class="color-input"
            :value="background || '#000000'"
            @mousedown="handleSliderDragStart('background', selectedObject)"
            @input="handleSliderInput('background', $event.target.value)"
            @mouseup="handleSliderDragEnd('background', $event.target.value)"
          >
          <button class="action-btn reset-btn small" @click="updateTextProperty('background', null)">无背景</button>
        </div>
      </div>
      <!-- BIUS -->
      <div class="param-item">
        <label class="param-label">BIUS</label>
        <div class="bius-group">
          <button class="toggle-btn" :class="{ active: bold }" @click="toggleTextProperty('bold')">B</button>
          <button class="toggle-btn" :class="{ active: italic }" @click="toggleTextProperty('italic')">I</button>
          <button class="toggle-btn" :class="{ active: underline }" @click="toggleTextProperty('underline')">U</button>
          <button class="toggle-btn" :class="{ active: lineThrough }" @click="toggleTextProperty('lineThrough')">S</button>
        </div>
      </div>
    </template>
    <template v-else>
      <!-- 图形颜色 -->
      <div class="param-item">
        <label class="param-label">图形颜色</label>
        <input 
          type="color" 
          class="color-input" 
          :value="background"
          @mousedown="handleSliderDragStart('background', selectedObject)"
          @input="handleSliderInput('background', $event.target.value)"
          @change="handleSliderDragEnd('background', $event.target.value)"
        >
      </div>
      <!-- 透明度 -->
      <div class="param-item">
        <label class="param-label">透明度</label>
        <div class="slider-group">
          <input 
            type="range" 
            class="param-slider" 
            min="0.1" 
            max="1" 
            step="0.1" 
            :value="opacity"
            @input="updateShapeProperty('opacity', Number($event.target.value))"
          >
          <span class="slider-value">{{ opacity }}</span>
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
            :value="borderWidth"
            @mousedown="handleSliderDragStart('border-width', selectedObject)"
            @input="handleSliderInput('border-width', $event.target.value)"
            @mouseup="handleSliderDragEnd('border-width', $event.target.value)"
          >
          <span class="slider-value">{{ borderWidth }}px</span>
        </div>
      </div>
      <!-- 边框颜色选择 -->
      <div class="param-item">
        <label class="param-label">边框颜色</label>
        <input 
          type="color" 
          class="color-input" 
          :value="borderColor"
          @mousedown="handleSliderDragStart('border-color', selectedObject)"
          @input="handleSliderInput('border-color', $event.target.value)"
          @change="handleSliderDragEnd('border-color', $event.target.value)"
        >
      </div>
      <!-- 图形大小参数根据图形类型调整 -->
      <div class="param-item" v-if="selectedObject._shape.type === 'rect'">
        <label class="param-label">宽度</label>
        <div class="slider-group">
          <input 
            type="range" 
            class="param-slider" 
            min="20" 
            max="400" 
            :value="shapeWidth"
            @mousedown="handleSliderDragStart('width', selectedObject)"
            @input="handleSliderInput('width', $event.target.value)"
            @mouseup="handleSliderDragEnd('width', $event.target.value)"
          >
          <span class="slider-value">{{ shapeWidth }}px</span>
        </div>
      </div>
      <div class="param-item" v-if="selectedObject._shape.type === 'rect'">
        <label class="param-label">高度</label>
        <div class="slider-group">
          <input 
            type="range" 
            class="param-slider" 
            min="20" 
            max="400" 
            :value="shapeHeight"
            @mousedown="handleSliderDragStart('height', selectedObject)"
            @input="handleSliderInput('height', $event.target.value)"
            @mouseup="handleSliderDragEnd('height', $event.target.value)"
          >
          <span class="slider-value">{{ shapeHeight }}px</span>
        </div>
      </div>
      <div class="param-item" v-if="selectedObject._shape.type === 'circle'">
        <label class="param-label">半径</label>
        <div class="slider-group">
          <input 
            type="range" 
            class="param-slider" 
            min="20" 
            max="200" 
            :value="radius"
            @mousedown="handleSliderDragStart('radius', selectedObject)"
            @input="handleSliderInput('radius', $event.target.value)"
            @mouseup="handleSliderDragEnd('radius', $event.target.value)"
          >
          <span class="slider-value">{{ radius }}px</span>
        </div>
      </div>
      <div class="param-item" v-if="selectedObject._shape.type === 'triangle'">
        <label class="param-label">大小</label>
        <div class="slider-group">
          <input 
            type="range" 
            class="param-slider" 
            min="20" 
            max="400" 
            :value="triangleSize"
            @mousedown="handleSliderDragStart('size', selectedObject)"
            @input="handleSliderInput('size', $event.target.value)"
            @mouseup="handleSliderDragEnd('size', $event.target.value)"
          >
          <span class="slider-value">{{ triangleSize }}px</span>
        </div>
      </div>
    </template>
    
    <!-- 关闭按钮 -->
    <div class="param-actions">
      <button class="action-btn close-btn" @click="closeFloatingPanel">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'
import { useUiStore } from '@/Main-page/Store/UIStore'
import { useHistoryStore } from '@/History/History'
const historyStore = useHistoryStore()
const canvasStore = useCanvasStore()
const uiStore = useUiStore()

// 从canvasStore获取选中对象
const selectedObject = computed(() => canvasStore.selectedObject)

// 从UI Store获取浮动参数控制栏拖动状态
const isDragging = computed(() => uiStore.floatingParam.isDragging)

// 文本属性
const textContent = ref('')
const fontFamily = ref('Arial')
const fontSize = ref(24)
const color = ref('#ffffff')
const background = ref(null)
const bold = ref(false)
const italic = ref(false)
const underline = ref(false)
const lineThrough = ref(false)

// 图形属性
const shapeWidth = ref(100)
const shapeHeight = ref(100)
const radius = ref(50)
const triangleSize = ref(100)
const borderWidth = ref(2)
const borderColor = ref('#333333')
const opacity = ref(1)

//拖动属性
let dragStartProps = null; 
let dragDisplayId = null;

//处理鼠标按下
const handleSliderDragStart = (property, display) => {
    
    dragDisplayId = display.id;
    dragStartProps = capturePropsSnapshot(display);
    console.log(dragStartProps) 
    uiStore.setFloatingParamDragging(true); 
    console.log('--- Drag Start (快照捕获) ---'); 
};
//处理鼠标拖拽
const handleSliderInput = (property, value) => {
    if (!selectedObject.value) return;

    const currentDisplay = selectedObject.value;
    const props = {};
    
    if (currentDisplay._shape.type === 'text') {
        props[property] = value;
        if (property === 'font-size' || property === 'font-family' || property === 'color' || property === 'background') {
             updateTextProperty(property, value, { record: false }); 
        } else {
             updateTextContent(value, { record: false });
        }
        
    } else {
        props[property] = value;
        canvasStore.renderer.applyShapeChange(currentDisplay, props);
    }
    
    switch(property){
      case 'width':
        shapeWidth.value = value;
        break;
      case 'height':
        shapeHeight.value = value;
        break;
      case 'radius':
        radius.value = value;
        break;
      case 'size': 
        triangleSize.value = value;
        break;
      case 'border-width':
        borderWidth.value = value;
        break;
      case 'opacity':
        opacity.value = value;
        break;
      case 'font-size':
        fontSize.value = value;
        break; 
      case 'background':
        background.value = value;
        break;
      case 'border-color' :
        borderColor.value = value;
        break;
      case 'color' :
        color.value = value;
        break;
    }
};

//处理鼠标结束拖拽
const handleSliderDragEnd = (property, value) => {
    const currentDisplay = selectedObject.value;
    uiStore.setFloatingParamDragging(false); 
    if (!currentDisplay || !dragStartProps || dragDisplayId !== currentDisplay.id) {
        dragStartProps = null;
        dragDisplayId = null;
        return;
    }
    
    // 确保最终值已应用
    const props = {};
    props[property] = value;
    canvasStore.renderer.applyShapeChange(currentDisplay, props);

    const finalProps = capturePropsSnapshot(currentDisplay);
    const startPropsForHistory = dragStartProps;
    // 记录合并的历史操作
    if (JSON.stringify(dragStartProps) !== JSON.stringify(finalProps)) {
        historyStore.recordAction({
            type: `slide_change_${currentDisplay._shape.type}`,
            undo: () => canvasStore.renderer.updateShape(currentDisplay, startPropsForHistory),
            redo: () => canvasStore.renderer.updateShape(currentDisplay, finalProps),
        });
        console.log('--- Drag End (合并历史记录) ---'); // 检查点
        console.log(finalProps)
    }

    // 重置状态
    dragStartProps = null;
    dragDisplayId = null;
};

// 从选中对象中提取属性值
const updatePropertiesFromObject = (obj) => {
  if (obj._shape.type === 'text') {
    // 更新文本属性
    textContent.value = obj.text || ''
    fontFamily.value = obj.style.fontFamily || 'Arial'
    fontSize.value = obj.style.fontSize || 24
    color.value = obj.style.fill || '#ffffff'
    background.value = obj.style.backgroundColor || null
    bold.value = obj.style.fontWeight === 'bold'
    italic.value = obj.style.fontStyle === 'italic'
    underline.value = obj.style.underline || false
    lineThrough.value = obj.style.lineThrough || false
  } else {
    // 更新图形属性
    const style = obj._style || {}
    background.value = style.background || '#42b983'
    borderWidth.value = style.borderWidth || 2
    borderColor.value = style.borderColor || '#333333'
    opacity.value = obj.alpha || 1
    
    // 根据图形类型更新尺寸属性
    if (obj._shape.type === 'rect') {
      shapeWidth.value = obj._shape.width || 100
      shapeHeight.value = obj._shape.height || 100
    } else if (obj._shape.type === 'circle') {
      radius.value = obj._shape.radius || 50
    } else if (obj._shape.type === 'triangle') {
      triangleSize.value = obj._shape.size || 100
    }
  }
}


const capturePropsSnapshot = (display) => {
    if (!display || !display._shape) return {};
    
    const shape = display._shape;
    const style = display._style || {};
    
    
    const snapshot = {
        // 几何属性
        width: shape.width,
        height: shape.height,
        radius: shape.radius,
        size: shape.size,
        text: display.text, 

        // 样式属性 (来自 _style)
        background: style.background,
        'border-width': style.borderWidth,
        'border-color': style.borderColor,
        opacity: display.alpha,
        
        // 文本样式属性 (来自 display.style)
        'font-family': display.style?.fontFamily,
        'font-size': display.style?.fontSize,
        color: display.style?.fill,
        bold: display.style?.fontWeight === 'bold',
        italic: display.style?.fontStyle === 'italic',
        underline: display.style?.underline,
        lineThrough: display.style?.lineThrough
        
    };
    return snapshot;
};

// 监听选中对象变化，更新属性值
watch(() => canvasStore.selectedObject, (newObj) => {
  if (newObj) {
    // 从选中对象中提取属性值
    updatePropertiesFromObject(newObj)
  }
}, { immediate: true })

// 更新文本内容
const updateTextContent = (value) => {
  if (selectedObject.value && selectedObject.value._shape.type === 'text') {
    canvasStore.renderer.updateShape(selectedObject.value, { text: value })
  }
}

// 更新文本属性
const updateTextProperty = (property, value) => {
  if (selectedObject.value && selectedObject.value._shape.type === 'text') {
    const props = {}
    props[property] = value
    canvasStore.renderer.updateShape(selectedObject.value, props)
    
    // 更新本地状态
    if (property === 'font-family') fontFamily.value = value
    if (property === 'font-size') fontSize.value = value
    if (property === 'color') color.value = value
    if (property === 'background') background.value = value
  }
}

// 切换文本样式属性
const toggleTextProperty = (property) => {
  if (selectedObject.value && selectedObject.value._shape.type === 'text') {
    const currentValue = property === 'bold' ? bold.value : 
                        property === 'italic' ? italic.value :
                        property === 'underline' ? underline.value :
                        lineThrough.value
    
    const props = {}
    props[property] = !currentValue
    canvasStore.renderer.updateShape(selectedObject.value, props)
    
    // 更新本地状态
    if (property === 'bold') bold.value = !currentValue
    if (property === 'italic') italic.value = !currentValue
    if (property === 'underline') underline.value = !currentValue
    if (property === 'lineThrough') lineThrough.value = !currentValue
  }
}

// 更新图形属性
const updateShapeProperty = (property, value) => {
  if (selectedObject.value && selectedObject.value._shape.type !== 'text') {
    const props = {}
    const currentDisplay = selectedObject.value;
    props[property] = value
    canvasStore.renderer.updateShape(currentDisplay, props);
    // 更新本地状态
    if (property === 'width') shapeWidth.value = value
    if (property === 'height') shapeHeight.value = value
    if (property === 'radius') radius.value = value
    if (property === 'size') triangleSize.value = value
    if (property === 'background') background.value = value
    if (property === 'border-width') borderWidth.value = value
    if (property === 'border-color') borderColor.value = value
    if (property === 'opacity') opacity.value = value
  }
}

// 关闭浮动面板
const closeFloatingPanel = () => {
  canvasStore.setSelected(null)
}
</script>

<style scoped>
/* 浮动参数面板容器 */
.floating-param-container {
  position: absolute;
  width: 220px;
  background-color: #ffffff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #f0f0f0;
  cursor: move;
}

/* 参数面板标题 */
.param-title {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: move;
  user-select: none;
}

/* 参数项容器 */
.param-item {
  margin-bottom: 15px;
}

/* 参数标签 */
.param-label {
  display: block;
  color: #666666;
  font-size: 12px;
  margin-bottom: 6px;
}

/* 颜色选择器 */
.color-input {
  width: 100%;
  height: 32px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  cursor: pointer;
  background-color: transparent;
  padding: 2px;
}

/* 滑块组 */
.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 参数滑块 */
.param-slider {
  flex: 1;
  height: 4px;
  accent-color: #409eff;
  cursor: pointer;
}

/* 滑块值显示 */
.slider-value {
  width: 50px;
  color: #333333;
  font-size: 11px;
  text-align: right;
}

/* 功能按钮容器 */
.param-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* 按钮基础样式 */
.action-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 4px;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

/* 关闭按钮 */
.close-btn {
  background-color: #909399;
}
.close-btn:hover {
  background-color: #73777b;
}

/* 文本输入样式 */
.text-input {
  width: 100%;
  height: 32px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
}

.text-area {
  width: 100%;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  padding: 6px;
  font-size: 12px;
  resize: vertical;
}

.bius-group {
  display: flex;
  gap: 6px;
}

.toggle-btn {
  width: 32px;
  height: 24px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 11px;
}
.toggle-btn.active {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.small {
  padding: 4px 6px;
  font-size: 11px;
}
</style>