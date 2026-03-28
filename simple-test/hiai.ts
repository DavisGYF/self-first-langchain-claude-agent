import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

async function main() {
  // 检查环境变量是否配置
  if (!process.env.LLM_API_KEY) {
    console.error("❌ 错误：请在 .env 文件中配置 LLM_API_KEY");
    console.log("📖 获取 API Key：");
    console.log("   - DeepSeek: https://platform.deepseek.com");
    console.log("   - 通义千问: https://dashscope.aliyun.com");
    process.exit(1);
  }

  console.log("🤖 正在连接 AI 模型...");
  console.log(`   模型: ${process.env.LLM_MODEL || "deepseek-chat"}`);
  console.log(
    `   地址: ${process.env.LLM_BASE_URL || "https://api.deepseek.com/v1"}`,
  );
  console.log("");

  // 初始化 AI 大脑
  const llm = new ChatOpenAI({
    modelName: process.env.LLM_MODEL || "deepseek-chat",
    temperature: 0.7,
    apiKey: process.env.LLM_API_KEY,
    configuration: {
      baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1",
    },
  });

  try {
    console.log(
      "📤 发送请求：我是一个前端开发者，想转向AI Agent开发。给我5个实战建议。",
    );
    console.log("⏳ 等待 AI 回复...\n");

    const response = await llm.invoke(
      "我是一个前端开发者，想转向AI Agent开发。给我5个实战建议。",
    );

    console.log("📥 AI 回复：\n");
    console.log(response.content);
    console.log("\n✅ 运行成功！");
  } catch (error) {
    console.error("❌ 调用失败：", error);
    console.log("\n💡 常见问题排查：");
    console.log("   1. 检查 API Key 是否正确");
    console.log("   2. 检查 API 地址是否可访问");
    console.log("   3. 检查账户余额是否充足");
  }
}

main();
