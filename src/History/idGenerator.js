// 使用一个非响应式的全局计数器
let uniqueIdCounter = 0;

/**
 * 返回一个递增的、唯一的数字 ID。
 * @returns {number}
 */
export function nextUniqueId() {
    uniqueIdCounter++;
    // 使用时间戳和随机数提高唯一性，但对您的场景，递增计数器就足够了
    return Date.now() + uniqueIdCounter; 
}