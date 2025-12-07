import { serializePixiObjects } from "@/LocalStorage/localCache";
import * as lz from 'lz-string';
import ShareWorker from '@/shareUtils/share.worker.js?worker';
export function getCanvasShareData(canvasStoreInstance){
    const serializedObjects = serializePixiObjects(canvasStoreInstance.objects);

    return{
        version: '1.0',
        timestamp: Date.now(),
        objects: serializedObjects,
    }

}

export function triggerFileDownload(data, filename){
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `canvas_share_${Date.now()}.canvas`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function createShareLink(canvasStore) {
    const serializedObjects = serializePixiObjects(canvasStore.objects);
    // const rawData = getCanvasShareData(canvasStore);
    // const jsonString = JSON.stringify(rawData);

    // const compressed = lz.compressToEncodedURIComponent(jsonString); 

    // // 2. 构建 URL：使用 # 避免将数据发送到服务器
    // const baseUrl = window.location.origin + window.location.pathname;
    // const shareUrl = `${baseUrl}#data=${compressed}`;

    // return shareUrl;
    return new Promise((resolve, reject) => {
        
        const worker = new ShareWorker(); 

        // 1. 监听 Worker 返回的消息
        worker.onmessage = function(event) {
            worker.terminate(); // 立即终止 Worker，释放资源

            const { compressedData, error } = event.data;
            
            if (error) {
                return reject(new Error(error));
            }

            // 2. 构建最终 URL
            const baseUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${baseUrl}#data=${compressedData}`;

            resolve(shareUrl);
        };
        
        // 3. 监听 Worker 错误 (如 Worker 文件不存在)
        worker.onerror = function(error) {
            worker.terminate();
            reject(error);
        };

        // 4. 将需要的数据发送给 Worker
        // ⚠️ 关键：只发送原始数据对象 (canvasStore.objects)，和 lz 库本身
        worker.postMessage({ 
            objects: serializedObjects, 
        });
    });
}