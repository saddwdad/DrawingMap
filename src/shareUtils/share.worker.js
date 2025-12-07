import { serializePixiObjects } from "@/LocalStorage/localCache";
import * as lz from 'lz-string';
export function getCanvasShareData(canvasStoreInstance){
    const serializedObjects = serializePixiObjects(canvasStoreInstance.objects);

    return{
        version: '1.0',
        timestamp: Date.now(),
        objects: serializedObjects,
    }

}

// 监听主线程发送的数据
self.onmessage = function(event) {
    // Worker 只能接收原始数据，不能接收 Pinia Store 实例
    const { objects, lzString } = event.data; 

    try {
        // 1. 执行耗时的序列化 (3+ 秒的阻塞)
        const rawData = {
            version: '1.0',
            timestamp: Date.now(),
            objects: objects, // 直接使用已序列化的 objects
        }
        const jsonString = JSON.stringify(rawData);

        // 2. 执行耗时的压缩
        const compressed = lz.compressToEncodedURIComponent(jsonString);

        // 3. 将结果发送回主线程
        self.postMessage({ compressedData: compressed, error: null });

    } catch (error) {
        // 捕获计算过程中的错误
        self.postMessage({ compressedData: null, error: error.message || 'Worker 计算错误' });
    }
};