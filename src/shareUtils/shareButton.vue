<template>
    <a-button 
    type="default" 
    shape="round" 
    :icon="createVNode(ShareAltOutlined)" 
    style="margin-left: 8px;"
    @click = "handleShareClick">
    分享
    </a-button>
    
    <a-button 
    type="default" 
    shape="round" 
    :icon="createVNode(UploadOutlined)" 
    style="margin-left: 8px;"
    @click = "openUploadModal">
    上传
    </a-button>
    
    <a-modal
      title="🔗 分享链接已生成"
      :open="isShareModalOpen"
      :maskClosable="false"  :footer="null"  @cancel="closeShareModal">
      <p>请手动复制下方链接进行分享：</p>
      
      <a-input
        :value="generatedShareUrl"
        readOnly
        @click="selectLink"
        ref="shareLinkInput"
        style="margin-bottom: 15px;"
      />
      
      <a-button type="primary" @click="downloadFile">下载分享文件</a-button>
      <a-button style="margin-left: 8px;" @click="closeShareModal">关闭</a-button>
    </a-modal>

    <a-modal
      title="📂 请上传分享链接"
      :open="isUploadModalOpen"
      :maskClosable="false"  :footer="null" @cancel="closeUploadModal"    >
      <p>请手动将链接粘贴到下方进行上传：</p>
      
      <a-input
        v-model:value="linkToUpload" placeholder="粘贴完整的分享 URL"
        style="margin-bottom: 15px;"
      />
      
      <!-- <a-button type="primary" @click="handleUploadFile">上传文件</a-button> -->
    <a-upload 
        :showUploadList="false" 
        :beforeUpload="handleUploadFile" 
        :customRequest="() => {}" 
        style="display: inline-block; margin-right: 8px;">
        <a-button type="primary">
            <upload-outlined /> 上传文件
        </a-button>
    </a-upload>
      <a-button style="margin-left: 8px;" @click="handleImportLink">解析链接</a-button>
      <a-button style="margin-left: 8px;" @click="closeUploadModal">关闭</a-button>
    </a-modal>


</template>

<script setup>
import { ref, createVNode, nextTick  } from 'vue';
import { useCanvasStore } from '@/Main-page/Store/canvasStore';
import { triggerFileDownload, createShareLink, getCanvasShareData} from './share';
import { parseShareLink } from './ReconstructFromSave';
import { message } from 'ant-design-vue';
import { ShareAltOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { CanvasCache } from '@/LocalStorage/localCache';
import { parseFileToRawData } from './ReconstructFromSave';

const canvasStore = useCanvasStore();
const canvasCache = CanvasCache
const isShareModalOpen = ref(false); 
const isUploadModalOpen = ref(false); 
const generatedShareUrl = ref('');
const shareLinkInput = ref(null); 
const linkToUpload = ref('')
const renderer = canvasStore.renderer

const waitForFrame = () => {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve); 
        });
    });
};

const nonBlockingCreateLink = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const url = createShareLink(canvasStore);
                resolve(url);
            } catch (error) {
                reject(error);
            }
        }, 0); 
    });
};

const handleShareClick = async () => {
    const KEY = 'share_link_generation';
    message.loading({ content: '正在生成分享链接并压缩画布数据...', key: KEY, duration: 0 });
    await waitForFrame();

    try {
        console.log("--- 1. 即将开始执行 createShareLink ---");
        const url = await createShareLink(canvasStore);
        
        generatedShareUrl.value = url;
        isShareModalOpen.value = true;
        
        message.success({
            content: "链接已生成，请手动复制链接。", 
            key: KEY, 
            duration: 3 
        });
        
    } catch (error) {
        console.error("链接生成失败:", error); 
        
        message.error({
            content: "链接生成失败",
            key: KEY,
            duration: 5
        });
    }
};

const closeShareModal = () => {
    isShareModalOpen.value = false; 
};

const openUploadModal = () => {
    isUploadModalOpen.value = true
}

const selectLink = () => {
    const inputElement = shareLinkInput.value; 
    if (inputElement && inputElement.$el) {

        const nativeInput = inputElement.$el.querySelector('input');
        if (nativeInput) {
            nativeInput.select();
            nativeInput.setSelectionRange(0, 99999);
        }
    }
};

const downloadFile = () => {
    try {
        const dataToSave = getCanvasShareData(canvasStore);
        triggerFileDownload(dataToSave);
        message.success("文件已开始下载。");
    } catch(error) {
        console.error("文件下载失败:", error);
        message.error("文件下载失败，请重试。");
    }
};



const closeUploadModal = () => {
    isUploadModalOpen.value = false;
};

const handleImportLink = async () => {
    try {
        const url = createShareLink(canvasStore);
        generatedShareUrl.value = url;
        isUploadModalOpen.value = true;   
    } catch (error) {
        console.error("上传弹窗失败:", error);
    }
    if (!linkToUpload.value) {
        message.warning("请先粘贴分享链接");
        return;
    }
    const rawData = parseShareLink(linkToUpload.value);
    if (rawData && rawData.objects) {
          console.log("解析成功，准备导入数据:", rawData);
          const reconstructor = (data) => canvasStore.reconstructItem( data );
          const newItems =  await canvasCache.deserializeObjects(rawData.objects, reconstructor);
            if(newItems.length > 0){
                newItems.forEach(obj => {
                    canvasStore.objects.push(obj); 
                    canvasStore.renderer.stage.addChild(obj); 
                });
                canvasStore.forceViewpotUpdate()
                renderer.app.renderer.render(renderer.app.stage);
            }
        message.success(`成功解析链接，导入了 ${rawData.objects.length} 个元素!`);
        closeUploadModal();
    } else {
        message.error("链接解析失败或数据无效！请检查链接是否完整。");
    }
};

const handleUploadFile = async (file) => {
    console.log("handleUploadFile 已被触发，接收到文件:", file);
    if (!file.name.endsWith('.canvas')) {
        message.error('请上传扩展名为 .canvas 的文件！');
        return false;
    }
    message.loading('正在解析文件...', 10);
try{
    const rawData = await parseFileToRawData(file);
    message.destroy(); 
    if (rawData && rawData.objects) {
          console.log("解析成功，准备导入数据:", rawData);
          const reconstructor = (data) => canvasStore.reconstructItem( data );
          const newItems =  await canvasCache.deserializeObjects(rawData.objects, reconstructor);
            if(newItems.length > 0){
                newItems.forEach(obj => {
                    canvasStore.objects.push(obj); 
                    canvasStore.renderer.stage.addChild(obj); 
                });
                canvasStore.forceViewpotUpdate()
                // renderer.app.renderer.render(renderer.app.stage);
            }
        message.success(`成功解析文件!`);
        closeUploadModal();
    }
} catch(e) {
        message.error("文件解析失败或数据无效！请检查文件是否完整。");
        console.log(error)
    }
    return false;

}


</script>

<style scoped>


</style>