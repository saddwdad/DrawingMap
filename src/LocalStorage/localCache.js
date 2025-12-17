// src/utils/localCache.js
import localForage from 'localforage';
import { useCanvasStore } from '@/Main-page/Store/canvasStore';

const ArrayOfObject = (arr) => Array.isArray(arr) && arr.every(item => typeof item === 'object' && item !== null);
// 初始化 IndexedDB 存储实例
const canvasStorage = localForage.createInstance({
  name: 'CanvasEditor', // 数据库名
  storeName: 'canvasData', // 存储表名
  description: '缓存画布形状、视口等数据'
});



/**
 * 【辅助函数 - 序列化】
 * 将 Pixi 元素数组转换为可存储的纯 JavaScript 数据数组
 * Pixi 元素对象上已经挂载了如 type, id, imageUrl, filters 等业务属性
 * @param {Array<PIXI.DisplayObject>} pixiObjects - Pixi 元素的数组
 * @returns {Array<Object>} 序列化后的数据数组
 */
  export const serializePixiObjects = (pixiObjects) => {
          if (!pixiObjects || !Array.isArray(pixiObjects)) return [];
          
          return pixiObjects.map(obj => {
              let itemType = obj.type;
              if (!itemType && obj._shape && obj._shape.type) {
                  itemType = obj._shape.type;
              }
              // 1. 通用数据提取
              const serialized = {
                  id: obj.id,
                  type: itemType, 
                  x: obj.x,
                  y: obj.y,
                  rotation: obj.rotation || 0,
                  scaleX: obj.scale ? obj.scale.x : 1, // 确保提取 scale
                  scaleY: obj.scale ? obj.scale.y : 1,
              };

              // 2. 类型特定数据提取
              if (itemType === 'picture' && obj.imageUrl) {
                  // 提取图片专属数据 (来自 renderImageAndRecord)
                  serialized.imageUrl = obj.imageUrl;
                  // filters 被挂载在对象上
                  serialized.filters = obj.rawFilters || obj.filters || {}; 
                  serialized.rawSvg = obj.rawSvg
                  serialized.isAiGenerated = obj.isAiGenerated

              } else if (['rect', 'circle', 'triangle'].includes(itemType)) {
                  if(obj._shape){
                    if(itemType === 'rect'){
                      serialized.width = obj._shape.width
                      serialized.height = obj._shape.height
                    }
                    if(itemType === 'circle'){
                      serialized.radius = obj._shape.radius
                    }
                    if(itemType === 'triangle'){
                      serialized.size = obj._shape.size
                    }
                  }
                  if(obj._style){
                        serialized.background = obj._style.background
                        serialized.borderWidth = obj._style.borderWidth
                        serialized.borderColor = obj._style.borderColor
                      }
                  }
                  else if(itemType === 'text'){
                    serialized.text = obj.text;
                    serialized.fontFamily = obj.style.fontFamily
                    serialized.fontSize = obj.style.fontSize
                    serialized.fill = obj.style.fill
                    serialized.backgroundColor = obj.style.backgroundColor
                    serialized.fontWeight = obj.style.fontWeight
                    serialized.fontStyle = obj.style.fontStyle
                    serialized.underline = obj.style.underline
                    serialized.lineThrough = obj.style.lineThrough
                  }
                  
              
              
              return serialized;
          });
      };

export const CanvasCache = {
  // 缓存key（单条数据存储，key固定）
  CACHE_KEY: 'canvas_editor_main_data',

  /**
   * 保存数据到 IndexedDB
   * @param {Object} data - 要缓存的画布数据
   */

  serialize(data) {
    const store = useCanvasStore();
    const result = { ...data };

    // 1. 处理常规物体
    if (result.objects) {
      result.objects = serializePixiObjects(result.objects);
    }

    // 只要 renderer 里的那个 Canvas 存在，我们就直接提取
    if (store.renderer && store.renderer.globalDrawingCtx) {
      const canvas = store.renderer.globalDrawingCtx.canvas;
      result.globalDrawingData = canvas.toDataURL('image/png');
      console.log('📦 全局涂鸦层已直接在 Cache 层提取完毕');
    }

    return result;
  },

  _drawBase64ToCanvas(base64, renderer) {
    const img = new Image();
    img.onload = () => {
      const ctx = renderer.globalDrawingCtx;
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        // 别忘了通知 Pixi 纹理更新了，不然画面不闪现
        renderer.globalDrawingSprite.texture.source.update();
      }
    };
    img.src = base64;
  },

  async deserializeObjects(serializedObjects, reconstructor) {
      if (!ArrayOfObject(serializedObjects) || typeof reconstructor !== 'function') {
          return [];
      }
      
      const reconstructionPromises = serializedObjects.map(data => reconstructor(data));
      // 等待所有异步重建（特别是图片加载）完成
      const rebuiltObjects = await Promise.all(reconstructionPromises);
      
      // 过滤掉重建失败的 null 值
      return rebuiltObjects.filter(obj => obj !== null);
  },

  async save(data) {
    try {
      // 存储格式：包含时间戳（用于后续过期判断）
      const serializedData = this.serialize(data)
      const saveData = {
        timestamp: Date.now(),
        data: serializedData // 画布objects序列化后数据
      };
      await canvasStorage.setItem(this.CACHE_KEY, saveData);
      console.log('画布数据已缓存到 IndexedDB');
      return true;
    } catch (err) {
      console.warn('IndexedDB 缓存失败：', err);
      return false;
    }
  },

  /**
   * 从 IndexedDB 读取缓存数据
   * @returns {Object|null} 缓存数据（无缓存/过期返回null）
   */
  async get(storeInstance) {
    try {
      const cached = await canvasStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      // 可选：设置缓存有效期（比如7天，超过则清除）
      const EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7天
      const isExpired = Date.now() - cached.timestamp > EXPIRY_TIME;
      if (isExpired) {
        await this.clear();
        return null;
      }
      const rawData = cached.data
      if (rawData.globalDrawingData && storeInstance.renderer) {
        this._drawBase64ToCanvas(rawData.globalDrawingData, storeInstance.renderer);
      }
      if (rawData && rawData.objects && Array.isArray(rawData.objects) && storeInstance && storeInstance.reconstructItem) {
          
          // 获取 canvasStore 中用于安全重建的 action
          const reconstructor = (data) => storeInstance.reconstructItem( data );
          
          // 调用反序列化逻辑，返回 PIXI 实例数组
          return await this.deserializeObjects(rawData.objects, reconstructor);
      }

      return null;


    } catch (err) {
      console.warn('IndexedDB 读取失败：', err);
      return null;
    }
  },

  /**
   * 清除 IndexedDB 缓存
   */
  async clear() {
    try {
      await canvasStorage.removeItem(this.CACHE_KEY);
      console.log('画布缓存已清除');
      return true;
    } catch (err) {
      console.warn('清除缓存失败：', err);
      return false;
    }
  },

  /**
   * 批量保存（如果后续需要分条存储形状，可扩展）
   * @param {Array} items - 形状数组
   */
  async batchSave(items) {
    try {
      const promises = items.map(item => 
        canvasStorage.setItem(`shape_${item.id}`, item)
      );
      await Promise.all(promises);
      return true;
    } catch (err) {
      console.warn('批量缓存失败：', err);
      return false;
    }
  }
};