cd ~/Desktop
mkdir my-first-agent && cd my-first-agent

npm init -y
npm install @langchain/openai dotenv
npm install -D typescript @types/node tsx

# 创建 tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 创建 .env（记得替换成你的真实 API Key）
cat > .env << 'EOF'
LLM_API_KEY=你的DeepSeek_API_Key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
EOF

# 创建 hello-agent.ts
cat > hello-agent.ts << 'EOF'
import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';

async function main() {
  if (!process.env.LLM_API_KEY) {
    console.error('❌ 错误：请在 .env 文件中配置 LLM_API_KEY');
    console.log('📖 获取 API Key：https://platform.deepseek.com');
    process.exit(1);
  }

  console.log('🤖 正在连接 AI 模型...');
  console.log(`   模型: ${process.env.LLM_MODEL || 'deepseek-chat'}`);
  console.log('');

  const llm = new ChatOpenAI({
    modelName: process.env.LLM_MODEL || 'deepseek-chat',
    temperature: 0.7,
    apiKey: process.env.LLM_API_KEY,
    configuration: {
      baseURL: process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
    },
  });

  try {
    console.log('📤 提问：前端开发者如何转向AI Agent开发？');
    console.log('⏳ 等待回复...\n');

    const response = await llm.invoke(
      '我是一个前端开发者，想转向AI Agent开发。给我5个实战建议。'
    );

    console.log('📥 AI 回复：\n');
    console.log(response.content);
    console.log('\n✅ 运行成功！');
  } catch (error) {
    console.error('❌ 调用失败：', error);
  }
}

main();
EOF

# 修改 package.json 添加运行脚本
npm pkg set scripts.start="tsx hello-agent.ts"
npm pkg set scripts.dev="tsx watch hello-agent.ts"

echo ""
echo "✅ 项目创建完成！"
echo "📝 下一步："
echo "   1. 编辑 .env 文件，填入你的真实 API Key"
echo "   2. 运行 npm start"