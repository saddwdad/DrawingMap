import { defineStore } from 'pinia'

export const useContextMenuStore = defineStore('contextMenu', {
  state: () => ({
    show: false, // 菜单显示状态
    left: 0, // 菜单左侧定位（px）
    top: 0, // 菜单顶部定位（px）
    items: [] // 菜单项配置：[{ label, key, disabled, handler }]
  }),
  actions: {
    /**
     * 显示右键菜单
     * @param {number} x - 鼠标X坐标（clientX）
     * @param {number} y - 鼠标Y坐标（clientY）
     * @param {Array} items - 菜单项数组
     */
    showMenu(x, y, items) {
      this.left = x + 5; // 偏移5px，避免遮挡鼠标
      this.top = y + 5;
      this.items = items; // 动态传入菜单项（支持不同场景自定义）
      this.show = true;
    },

    /**
     * 隐藏右键菜单
     */
    hideMenu() {
      this.show = false;
      this.items = []; // 清空菜单项，避免残留
    },

    /**
     * 执行菜单项点击事件
     * @param {string} key - 菜单项唯一标识
     */
    executeItem(key) {
      const item = this.items.find(item => item.key === key);
      if (item && !item.disabled && typeof item.handler === 'function') {
        item.handler(); // 执行菜单项绑定的方法
      }
      this.hideMenu(); // 执行后自动关闭菜单
    }
  }
})