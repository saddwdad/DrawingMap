// 使用一个非响应式的全局计数器
let uniqueIdCounter = 0;

/**
 * 返回一个递增的、唯一的数字 ID。
 * @returns {number}
 */
export function nextUniqueId() {
    uniqueIdCounter++;
    return Date.now() + uniqueIdCounter; 
}