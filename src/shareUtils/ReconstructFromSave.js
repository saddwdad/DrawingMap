import * as lz from 'lz-string';

//读取链接
export function parseShareLink(shareUrl) {
    if (!shareUrl) return null;
    
    try {
        // 创建一个 URL 对象来安全解析 hash
        const url = new URL(shareUrl.startsWith('http') ? shareUrl : 'http://a.com/' + shareUrl);
        const hash = url.hash.substring(1); // 移除开头的 #

        if (!hash.startsWith('data=')) {
            console.error("URL 哈希格式不正确，缺少 'data='");
            return null;
        }

        const compressedData = hash.substring('data='.length);
        if (!compressedData) return null;

        // 解压缩并解析
        const jsonString = lz.decompressFromEncodedURIComponent(compressedData);
        if (!jsonString) {
            console.error("数据解压缩失败或为空");
            return null;
        }

        const rawData = JSON.parse(jsonString);

        if (rawData && rawData.version && rawData.objects) {
            return rawData;
        }
    } catch (e) {
        console.error("解析或解压缩过程中发生错误:", e);
        return null;
    }

    return null;
}

//读取文件
export function parseFileToRawData(file) {
    if (!file) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const reader = new FileReader();

        // 当文件读取成功时
        reader.onload = (event) => {
            try {
                const jsonString = event.target.result;
                const rawData = JSON.parse(jsonString);

                // 简单的结构验证
                if (rawData && rawData.version && rawData.objects) {
                    console.log("文件解析成功:", rawData);
                    resolve(rawData);
                } else {
                    console.error("文件内容解析失败: 结构不正确。");
                    resolve(null);
                }
            } catch (e) {
                console.error("文件内容不是有效的 JSON:", e);
                resolve(null);
            }
        };

        // 当文件读取失败时
        reader.onerror = (error) => {
            console.error("读取文件时发生错误:", error);
            resolve(null);
        };
        // 以文本格式读取文件内容
        reader.readAsText(file);
    });
}