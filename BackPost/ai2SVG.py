import dashscope
from dashscope import Generation, ImageSynthesis
import vtracer
import requests
import re
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
# 1. 初始化配置
dashscope.api_key = "sk-dc011ccc4e11482ea09ba27cbafd8382"
app = FastAPI()

# 2. 彻底解决跨域问题
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
)

class PromptReq(BaseModel):
    prompt: str
    os.environ['CURL_CA_BUNDLE'] = ''
    os.environ['REQUESTS_CA_BUNDLE'] = ''
def rewrite_prompt_with_qwen(user_prompt: str) -> str:
    messages = [
        {'role': 'system', 'content': '你是一个专业的 AI 绘画提示词专家。请将用户简单的词汇改写成一段丰富的、适合生成矢量图风格的中文提示词。只返回提示词内容，不要有废话。 生成的图像内容尽量简单，生成的图像不要包含背景'},
        {'role': 'user', 'content': user_prompt}
    ]
    try:
        response = Generation.call(model="qwen-turbo", messages=messages, result_format='message')
        if response.status_code == 200:
            return response.output.choices[0].message.content
    except Exception as e:
        print(f"Qwen 润色失败: {e}")
    return user_prompt

@app.post("/api/generate-ai-svg")
async def generate_ai_svg(req: PromptReq):
    try:
        # Step 1: 润色
        enhanced_prompt = rewrite_prompt_with_qwen(req.prompt)
        print(f"🚀 开始生成: {enhanced_prompt}")

        # Step 2: 万象生图
        rsp = ImageSynthesis.call(
            model=ImageSynthesis.Models.wanx_v1,
            prompt=enhanced_prompt,
            n=1,
            size='1024*1024'
        )
        
        if rsp.status_code != 200:
            return {"success": False, "msg": f"AI绘图接口报错: {rsp.message}"}

        if not hasattr(rsp, 'output') or len(rsp.output.results) == 0:
            return {"success": False, "msg": "AI未能生成图片结果"}

        image_url = rsp.output.results[0].url
        print(f"✅ 图片已生成: {image_url}")

        # Step 3: 下载图片 (增加 verify=False 和 timeout 解决 SSL 报错)
        # 加上 verify=False 是为了防止你本地网络环境导致的 SSL 握手失败
        img_res = requests.get(image_url, verify=False, timeout=30)
        img_data = img_res.content

        print("🔧 正在矢量化转换...")
        svg_str = vtracer.convert_raw_image_to_svg(
            img_data,
            filter_speckle=3, # 增大过滤
            color_precision=5   # 降低精度减少体积
        )

        # Step 5: 正则去背景 (抠掉第一个 path)
        svg_str = re.sub(r'<path [^>]* fill="[^"]*" [^>]*/>', '', svg_str, count=1)
        
        print("🎉 转换成功，正在推送给前端...")
        return {
            "success": True, 
            "svg_xml": svg_str,
            "enhanced_prompt": enhanced_prompt
        }

    except Exception as e:
        print(f"🔥 后端崩溃异常: {str(e)}")
        return {"success": False, "msg": f"系统内部错误: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)