<template>
  <div
    class="bg-gray-800 p-2 rounded-lg shadow-xl cursor-crosshair border border-gray-700 hover:border-blue-500 transition duration-200"
    :style="{ width: minimapWidth + 'px', height: minimapHeight + 'px' }"
    @click="handleMinimapClick"
  >
    <!-- Minimap Title：添加空值检查（关键修复） -->
    <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
        <span>Minimap</span>
        <span :class="{ 'text-green-400': hasContent, 'text-red-400': !hasContent }">
            <!-- 修复：添加 objects.value?.length 空值检查 -->
            {{ hasContent ? `Objects: ${objects.value?.length || 0}` : 'Empty' }}
        </span>
    </div>
    <canvas ref="minimapCanvas" :width="minimapWidth - 16" :height="minimapHeight - 32" class="block bg-gray-900 rounded"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useCanvasStore } from '@/Main-page/Store/canvasStore';

const store = useCanvasStore();
const minimapCanvas = ref(null);

// 小地图固定尺寸
const minimapWidth = 200;
const minimapHeight = 150;
const minimapPadding = 8;

// 核心状态：优化响应式计算（添加空值保护）
const viewport = computed(() => store.viewport || { x: 0, y: 0, scale: 1 });
const bounds = computed(() => store.worldBounds || { minX: -1000, maxX: 1000, minY: -1000, maxY: 1000, width: 2000, height: 2000 });
const canvasSize = computed(() => store.minimap?.viewportSize || { width: 800, height: 600 });
const renderer = computed(() => store.renderer);
const objects = computed(() => {
  // 多层兼容：确保即使 renderer 变化，也能正确获取数组
  if (!renderer.value) return [];
  // 确保 objects 始终是数组（避免清除后变为 undefined）
  if (!Array.isArray(renderer.value.objects)) {
    renderer.value.objects = []; // 自动修复为数组
    return [];
  }
  const brushList = store.objects || [];
  const rendererList = renderer.value.objects
  return rendererList
});
const hasContent = computed(() => objects.value.length > 0);

/**
 * 世界坐标 -> 小地图坐标
 */
const worldToMinimap = (worldX, worldY) => {
  const world = bounds.value;
  const canvas = minimapCanvas.value;
  if (!canvas || !world) return { x: 0, y: 0, scale: 1, objScale: 0.05 }; // 新增objScale：对象独立缩放比例

  const drawW = canvas.width - 2 * minimapPadding;
  const drawH = canvas.height - 2 * minimapPadding;

  // 视口缩放比例（用于定位）
  const scaleX = world.width > 0 ? drawW / world.width : 1;
  const scaleY = world.height > 0 ? drawH / world.height : 1;
  const viewScale = Math.min(scaleX, scaleY);

  // 新增：对象独立缩放比例（固定0.05，确保不同大小的图形差异明显）
  // 这个值可以调整：0.05 表示主画布100px的图形，小地图上显示5px；主画布200px的图形，显示10px
  const objScale = 0.05;

  const offsetX = minimapPadding + (drawW - world.width * viewScale) / 2;
  const offsetY = minimapPadding + (drawH - world.height * viewScale) / 2;

  const minimapX = (worldX - world.minX) * viewScale + offsetX;
  const minimapY = (worldY - world.minY) * viewScale + offsetY;

  return { x: minimapX, y: minimapY, scale: viewScale, objScale };
};

/**
 * 修复：绘制单个对象（重点优化大小区分）
 */
const drawObject = (obj, ctx) => {
  // 基础校验
  console.log('type属性:', obj.type);
  if (!obj || obj.x === undefined || obj.y === undefined) return;

  // 1. 获取基础位置信息（函数顶层只声明一次）
  const mmPos = worldToMinimap(obj.x, obj.y);
  const mmX = mmPos.x;
  const mmY = mmPos.y;
  const mmScale = mmPos.scale; // 这是世界缩放比例
  const mmObjScale = mmPos.objScale; // 这是你定义的 0.05 独立缩放

  const shape = obj._shape || {};
  const style = obj._style || {};

  // 颜色逻辑
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const fillColor = style.background || colors[objects.value.indexOf(obj) % colors.length];
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  let drawSize, drawWidth, drawHeight, radius;
  let targetType = obj.type || shape.type;
  if (obj.isBrushLine) {
    targetType = 'line';
  }

  // 如果还是没有，再看构造函数
  if (!targetType) {
      targetType = obj.constructor?.name;
  }
  // 2. 根据对象类型绘制
  switch (targetType) {
    case 'line': {
      // 1. 强制更新几何体（v8 关键：防止 bounds 没计算）
      // obj.geometry?.update(); // 如果报错可以注释掉，通常 v8 会自动处理

      // 2. 颜色提取
      const strokeColor = obj._stroke?.color || '#3b82f6';
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;

      // 3. 获取边界数据
      const b = obj.getBounds();
      
      // 🌟 核心修正：主画布上的绝对位置 = 对象位置(mmX, mmY) + 内部偏移(b.x, b.y)
      // 如果对象没有内部路径，b.width 会是 0
      if (b.width === 0 || b.height === 0) {
        // 如果还没生成路径，在对象的 x,y 处画个大圆点，确保能看见
        ctx.beginPath();
        ctx.arc(mmX, mmY, 4, 0, Math.PI * 2); 
        ctx.fill();
      } else {
        // 转换到小地图坐标
        const rectX = mmX + b.x * mmScale;
        const rectY = mmY + b.y * mmScale;
        const rectW = Math.max(b.width * mmScale, 5); // 稍微加大点
        const rectH = Math.max(b.height * mmScale, 5);
        
        // 绘制外框
        ctx.lineWidth = 2;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        // 填充半透明内部，防止线太细看不见
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillRect(rectX, rectY, rectW, rectH);
        ctx.restore();
      }
      console.log('识别到了画线')
      break;
    }
    case 'rect':
      drawWidth = (shape.width || 100) * mmObjScale;
      drawHeight = (shape.height || 100) * mmObjScale;
      drawWidth = Math.max(2, Math.min(60, drawWidth));
      drawHeight = Math.max(2, Math.min(60, drawHeight));
      
      ctx.beginPath();
      ctx.rect(mmX - drawWidth/2, mmY - drawHeight/2, drawWidth, drawHeight);
      ctx.fill();
      ctx.stroke();
      break;

    case 'circle':
      radius = (shape.radius || 50) * mmObjScale;
      radius = Math.max(2, Math.min(30, radius));
      
      ctx.beginPath();
      ctx.arc(mmX, mmY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      break;

    case 'triangle':
      drawSize = (shape.size || 100) * mmObjScale;
      drawSize = Math.max(3, Math.min(60, drawSize));
      
      ctx.beginPath();
      ctx.moveTo(mmX, mmY - drawSize/2);
      ctx.lineTo(mmX + drawSize/2, mmY + drawSize/2);
      ctx.lineTo(mmX - drawSize/2, mmY + drawSize/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'text':
      const fontSize = shape.fontSize || 24;
      drawSize = fontSize * mmObjScale * 0.8;
      drawSize = Math.max(2, Math.min(10, drawSize));
      
      ctx.beginPath();
      ctx.rect(mmX - drawSize*1.5, mmY - drawSize/2, drawSize*3, drawSize);
      ctx.fill();
      ctx.stroke();
      break;

    case 'Sprite':
      const textureWidth = obj.texture?.width || 100;
      drawSize = textureWidth * mmObjScale * 0.5;
      drawSize = Math.max(4, Math.min(40, drawSize));
      
      ctx.beginPath();
      ctx.rect(mmX - drawSize/2, mmY - drawSize/2, drawSize, drawSize);
      ctx.fill();
      ctx.stroke();
      break;

    default:
      drawSize = (shape.size || 50) * mmObjScale;
      drawSize = Math.max(2, Math.min(20, drawSize));
      
      ctx.beginPath();
      ctx.rect(mmX - drawSize/2, mmY - drawSize/2, drawSize, drawSize);
      ctx.fill();
      ctx.stroke();
      break;
  }
};

/**
 * 绘制视口框
 */
const drawViewport = (ctx) => {
  
  const world = bounds.value;
  const canvas = minimapCanvas.value;
  if (!world || !canvas) return;

  const viewportW = canvasSize.value.width / viewport.value.scale;
  const viewportH = canvasSize.value.height / viewport.value.scale;
  const { x: mmCenterX, y: mmCenterY, scale } = worldToMinimap(viewport.value.x, viewport.value.y);

  const mmViewportW = viewportW * scale;
  const mmViewportH = viewportH * scale;

  const drawW = Math.max(mmViewportW, 20);
  const drawH = Math.max(mmViewportH, 15);
  const x = mmCenterX - drawW/2;
  const y = mmCenterY - drawH/2;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.beginPath();
  ctx.rect(x, y, drawW, drawH);
  ctx.fill();
  ctx.stroke();

  // 简化中心点绘制
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(mmCenterX, mmCenterY, 2, 0, 2 * Math.PI);
  ctx.fill();
};

/**
 * 核心绘制逻辑（性能优化：减少绘制次数和复杂度）
 */
const drawMinimap = () => {
  const canvas = minimapCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 清空画布（简化操作）
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 简化世界边界绘制（只画边框，不填充）
  const world = bounds.value;
  const { scale } = worldToMinimap(0, 0);
  const drawW = world.width * scale;
  const drawH = world.height * scale;
  const offsetX = minimapPadding + (canvas.width - 2*minimapPadding - drawW)/2;
  const offsetY = minimapPadding + (canvas.height - 2*minimapPadding - drawH)/2;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, drawW, drawH);
  ctx.stroke();

  // 绘制对象（简化逻辑，提升性能）
  if (objects.value.length > 0) {
    // 批量绘制，减少上下文切换
    ctx.save();
    objects.value.forEach(obj => {
      try {
        drawObject(obj, ctx);
        console.log("小地图检测到对象数量:", store.objects.length);
      } catch (e) {
        console.warn('绘制对象失败:', e);
      }
    });
    ctx.restore();
  } else {
    // 简化无对象提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No Objects', canvas.width/2, canvas.height/2);
  }

  // 绘制视口框
  drawViewport(ctx);
};

/**
 * 小地图点击定位
 */
const handleMinimapClick = (event) => {
  const canvas = minimapCanvas.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const world = bounds.value;

  const drawW = canvas.width - 2 * minimapPadding;
  const drawH = canvas.height - 2 * minimapPadding;
  const scaleX = world.width > 0 ? drawW / world.width : 1;
  const scaleY = world.height > 0 ? drawH / world.height : 1;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = minimapPadding + (drawW - world.width * scale) / 2;
  const offsetY = minimapPadding + (drawH - world.height * scale) / 2;

  const worldX = (mouseX - offsetX) / scale + world.minX;
  const worldY = (mouseY - offsetY) / scale + world.minY;

  store.centerViewportOnWorldCoords(worldX, worldY);
};

/**
 * 初始化小地图
 */
const initMiniMap = async () => {
  await nextTick();
  if (minimapCanvas.value) {
    drawMinimap();
    return true;
  }
  return false;
};

/**
 * 销毁小地图
 */
const destroyMiniMap = () => {
  const canvas = minimapCanvas.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

// 暴露方法
defineExpose({
  initMiniMap,
  destroyMiniMap
});

// 性能优化：降低监听频率（使用防抖）
let debounceTimer = null;
const debouncedDraw = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    drawMinimap();
  }, 30); // 30ms延迟，减少重绘次数
};
const objectChangeKey = computed(() => store.objectChangeKey);
// 优化监听逻辑：只监听必要的变化，且使用防抖
watch([viewport, bounds, objects, objectChangeKey], debouncedDraw, { deep: true, immediate: true });

// 组件挂载时绘制
onMounted(() => {
  drawMinimap();
});

// 组件卸载时清除防抖计时器
onUnmounted(() => {
  clearTimeout(debounceTimer);
});
</script>