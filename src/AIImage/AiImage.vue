<template>
  <div class="ai-trigger-container">
    <a-button type="primary" style="margin-left: 8px;" shape="round" @click="openAiModal">
      <template #icon><RobotOutlined /></template>
      召唤 AI 素材
    </a-button>

    <a-modal
      v-model:open="isAiModalOpen"
      title="AI 素材召唤中心"
      :footer="null" 
      centered
      destroyOnClose
      :maskClosable="!loading"
    >
      <div style="padding: 10px 0">
        <a-space direction="vertical" style="width: 100%" size="large">
          <a-typography-text type="secondary">
            请输入你想生成的素材描述，AI 将为你自动转换为矢量纹理。
          </a-typography-text>
          
          <a-input-search
            v-model:value="userPrompt"
            placeholder="例如：一只戴墨镜的小恐龙..."
            enter-button="开始生成"
            size="large"
            :loading="loading"
            @search="generateAiAsset"
          />
        <div style="display: flex; justify-content: center; width: 100%; margin-top: 10px;">
        <a-button @click="closeAiModal" type="primary">关闭</a-button>
        </div>

          <div v-if="loading" style="text-align: center; margin-top: 10px;">
            <a-spin size="small" />
            <span style="margin-left: 8px; color: #1890ff">Qwen 润色中 & 万象构图中...</span>
          </div>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { message } from 'ant-design-vue';
import * as PIXI from 'pixi.js';
import { useCanvasStore } from '@/Main-page/Store/canvasStore';
const userPrompt = ref('');
const loading = ref(false);
const canvasStore = useCanvasStore()
const isAiModalOpen = ref(false)
const openAiModal = () => {
    isAiModalOpen.value = true
}
const closeAiModal = () => {
    isAiModalOpen.value = false
}

const generateAiAsset = async () => {
  if (!userPrompt.value) return message.warning('请输入描述词哦！');

  loading.value = true;
  try {
    const response = await axios.post('http://127.0.0.1:8000/api/generate-ai-svg', {
      prompt: userPrompt.value
    },{
        timeout: 60000
    });

    if (response.data.success) {
      console.log('1. 后端成功返回数据');
      const result = response.data.svg_xml;
      const blob = new Blob([result], { type: 'image/svg+xml;charset=utf-8' });
      const aiImageUrl = URL.createObjectURL(blob);
      console.log('2. Blob URL已生成:', aiImageUrl);
      console.log('3. 开始准备进入渲染逻辑');
      await canvasStore.renderer.renderImage(canvasStore.renderer.app.screen.width / 2, canvasStore.renderer.app.screen.height / 2, aiImageUrl, {
            scale: 0.5, // 或者是你想要的缩放
            filters: 'none'
      });
      console.log('4. 渲染函数执行完毕');
      message.success('素材已放置在画布中心！');
      userPrompt.value = '';
    } else {
      message.error(response.data.msg);
    }
  } catch (error) {
    message.error('连接后端失败，请检查 Python 服务是否启动',error);
  } finally {
    loading.value = false;
  }
};

</script>

<style scoped>
.ai-panel-container {
  position: absolute;
  top: 80px; /* 避开顶栏 */
  right: 20px;
  z-index: 1000;
}
.ai-card {
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
}
</style>