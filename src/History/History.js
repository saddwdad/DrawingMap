import { defineStore } from 'pinia'
import { useCanvasStore } from '@/Main-page/Store/canvasStore'
import { nextUniqueId } from './idGenerator'
import { markRaw } from 'vue'
// 操作类型枚举（可选，用于区分操作）
export const ActionType = {
  ADD_PICTURE: 'add_picture',
  ADD_SHAPE: 'add_shape',
  DELETE: 'delete',
  CLEAR: 'clear'
}

export const useHistoryStore = defineStore('history', {
  state: () => ({
    undoStack: markRaw([]),       // 存储可撤销的操作
    redoStack: markRaw([]),       // 存储可重做的操作
    historyLimit: 30,    // 历史记录上限
    isOperating: false   // 防止操作中重复记录
  }),
  getters: {
    canUndo: (state) => state.undoStack.length > 0,
    canRedo: (state) => state.redoStack.length > 0,
    undoCount: (state) => state.undoStack.length,
    redoCount: (state) => state.redoStack.length,
  },
  actions: {
    /**
     * 核心：记录操作（canvasStore 只需要调用这个方法，不用管后续）
     * @param {Object} action - 操作描述（必须包含：type、undo、redo）
     * action 结构：{
     *   type: 操作类型（如 ActionType.ADD_PICTURE）,
     *   undo: () => {}, // 撤销逻辑（由 canvasStore 提供具体实现）
     *   redo: () => {}  // 重做逻辑（由 canvasStore 提供具体实现）
     * }
     */
    recordAction(action) {
        // 🔴 仅在 isOperating 时返回（避免操作中重复记录）
        if (this.isOperating) {
          console.warn('操作中，暂不记录历史');
          return;
        }

        if (!action || !action.type || typeof action.undo !== 'function' || typeof action.redo !== 'function') {
          console.warn('无效操作记录：必须包含 type、undo、redo 方法');
          return;
        }

        // 超过上限移除最旧记录
        if (this.undoStack.length >= this.historyLimit) {
          this.undoStack.shift();
          console.log('历史记录超过上限，移除最旧记录');
        }

        this.undoStack.push(action);
        this.redoStack = []; // 新操作清空重做栈
        console.log(`记录操作：${action.type}，当前 undoStack 长度：${this.undoStack.length}`);
      },

    /**
     * 执行撤销（canvasStore 直接调用，无需传参）
     */
    async undo() {
      if (this.isOperating || this.undoStack.length === 0) return console.log("无可用撤销操作")

      this.isOperating = true
      const action = this.undoStack.pop()
      console.log(`执行撤销：${action.type}`)
      try {
        await action.undo() // 执行 canvasStore 提供的撤销逻辑
        this.redoStack.push(action)
        this.notifyCanvas('undo')
        
        //执行完 undo 之后，立即清理 canvasStore 数组中的坏引用
        const canvasStore = useCanvasStore()
        if (canvasStore && Array.isArray(canvasStore.objects)) {
          // 仅过滤 null/undefined 对象，防止 Vue 代理崩溃
          canvasStore.objects = canvasStore.objects.filter(obj => obj !== null && obj !== undefined)
          
          // 如果 Renderer.js 中也有 objects 数组
          if (canvasStore.renderer && canvasStore.renderer.objects) {
              canvasStore.renderer.objects = canvasStore.renderer.objects.filter(obj => obj !== null && obj !== undefined)
              
          }
        }
      } catch (err) {
        console.error('撤销失败：', err)
        this.undoStack.push(action) // 失败回滚
      } finally {
        this.isOperating = false
      }
    },

    /**
     * 执行重做（canvasStore 直接调用，无需传参）
     */
    async redo() {
      if (!this.canRedo) return console.log("无可用重做操作")

      this.isOperating = true
      const action = this.redoStack.pop()
      console.log(`执行重做：${action.type}`)
      try {
        await action.redo() // 执行 canvasStore 提供的重做逻辑
        this.undoStack.push(action)
        this.notifyCanvas('redo')
        
        //执行完 redo 之后，立即清理 canvasStore 数组中的坏引用
        const canvasStore = useCanvasStore()
        if (canvasStore && Array.isArray(canvasStore.objects)) {
          // 仅过滤 null/undefined 对象
          canvasStore.objects = canvasStore.objects.filter(obj => obj !== null && obj !== undefined)
          
          if (canvasStore.renderer && canvasStore.renderer.objects) {
              canvasStore.renderer.objects = canvasStore.renderer.objects.filter(obj => obj !== null && obj !== undefined)
          }
        }
      } catch (err) {
        console.error('重做失败：', err)
        this.redoStack.push(action) // 失败回滚
      } finally {
        this.isOperating = false
      }
    },

    /**
     * 清空历史记录
     */
    clearHistory() {
      this.undoStack = []
      this.redoStack = []
      this.notifyCanvas('clear')
    },

    /**
     * 通知 canvasStore 状态变化（可选，解耦用）
     * 如需 canvasStore 做额外处理（如清空选中），可在 canvasStore 中监听
     */
    notifyCanvas(type) {
      // 可通过 pinia 的订阅或事件总线通知，这里简化为直接调用（也可移除）
      const canvasStore = useCanvasStore()
      if (canvasStore && typeof canvasStore.clearSelection === 'function') {
        canvasStore.clearSelection()
      }
    }
    
  },
  persist: {
    enabled: false
  }
})