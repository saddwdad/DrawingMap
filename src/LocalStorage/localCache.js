// src/utils/localCache.js
import localForage from 'localforage';

// 初始化 IndexedDB 存储实例
const canvasStorage = localForage.createInstance({
  name: 'CanvasEditor', // 数据库名
  storeName: 'canvasData', // 存储表名
  description: '缓存画布形状、视口等数据'
});

export const CanvasCache = {
  // 缓存key（单条数据存储，key固定）
  CACHE_KEY: 'canvas_editor_main_data',

  /**
   * 保存数据到 IndexedDB
   * @param {Object} data - 要缓存的画布数据
   */
  async save(data) {
    try {
      // 存储格式：包含时间戳（用于后续过期判断）
      const saveData = {
        timestamp: Date.now(),
        data: data // 你的画布数据（objects、viewport、minimap等）
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
  async get() {
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

      return cached.data;
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