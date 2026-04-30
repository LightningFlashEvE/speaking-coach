# Speaking Coach

AI 英语口语陪练 Web 应用，提供沉浸式的实时语音对话练习体验。专为希望提升英语口语能力的中文母语使用者设计。

## 🌟 功能特性

- **真正的实时语音对话**：基于 Aliyun Bailian (DashScope) `qwen3.5-omni` 模型，支持流式音频传输和毫秒级响应。
- **自动断句识别 (VAD)**：集成服务端语音活动检测，AI 能自动识别用户说话结束并即时回应，无需手动按键。
- **实时字幕显示**：对话过程中同步显示用户和 AI 的语音转文字内容，支持实时预览（Delta）和最终校对。
- **场景式对话练习**：提供机场入境、咖啡店点单、酒店入住、职场面试等 6 个真实生活场景。
- ** clay-morphism 视觉设计**：基于 Clay 风格的温润、高级感 UI 界面，提供愉悦的练习氛围。
- **文字兜底练习**：在不便使用语音时，支持完整的 WebSocket 文本对话流程。
- **详细练习报告**：会话结束后，基于 MiniMax 大模型生成多维度的练习评估报告，包含语法纠错、表达建议及得分。

## 🏗️ 项目结构

```text
speaking-coach/
├── apps/
│   ├── api/                    # NestJS 后端服务
│   │   ├── src/
│   │   │   ├── aliyun/        # Aliyun Bailian 实时语音集成
│   │   │   ├── minimax/       # MiniMax Chat（文本兜底、纠错与报告生成）
│   │   │   ├── scenario/      # 练习场景管理
│   │   │   ├── session/       # 数据库会话存储
│   │   │   ├── voice-session/ # WebSocket 实时音视频网关
│   │   │   └── report/        # 智能评估报告模块
│   │   └── prisma/            # 数据库 Schema 与迁移
│   └── web/                    # Next.js 前端应用
│       └── src/
│           ├── app/            # App Router 页面路由
│           ├── components/     # UI 组件
│           ├── hooks/          # useVoiceSession, usePcmRecorder 等核心逻辑
│           └── lib/            # API 请求库
├── packages/
│   └── shared/                 # 全栈共享代码包
│       ├── types.ts            # WebSocket 协议与业务模型类型
│       ├── api-types.ts        # HTTP 接口契约定义
│       └── scenarios.ts        # 练习场景静态配置
└── pnpm-workspace.yaml         # 单仓 (Monorepo) 配置
```

## 🛠️ 技术栈

| 领域 | 技术方案 |
|------|------|
| **前端** | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| **后端** | NestJS 11, WebSocket (ws) |
| **数据库** | Prisma ORM, SQLite (开发) / PostgreSQL (生产) |
| **实时语音** | Aliyun Bailian (DashScope) `qwen3.5-omni-flash-realtime` |
| **文本与评估** | MiniMax `MiniMax-M2.7` OpenAI-compatible API |
| **音频流** | 前端 AudioWorklet 采集 PCM -> WebSocket -> 后端 PCM 流式播放 (AudioContext) |

## 🚀 快速开始

### 环境要求

- Node.js >= 22 < 25
- pnpm >= 9

### 1. 安装依赖

```bash
git clone <repository-url>
cd speaking-coach
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 并重命名为 `.env`：

```bash
# 语音引擎配置
VOICE_MODE=realtime_voice
REALTIME_PROVIDER=aliyun_bailian

# Aliyun Bailian 配置 (主实时路线)
ALIYUN_DASHSCOPE_API_KEY=your_key_here
ALIYUN_REALTIME_MODEL=qwen3.5-omni-flash-realtime
ALIYUN_AUDIO_INPUT_FORMAT=pcm
ALIYUN_AUDIO_OUTPUT_FORMAT=pcm
ALIYUN_DIALOG_MODE=auto  # auto 开启服务端 VAD，实现自动断句

# MiniMax 配置 (纠错与报告生成)
MINIMAX_API_KEY=your_key_here
MINIMAX_CHAT_MODEL=MiniMax-M2.7
```

### 3. 启动应用

```bash
pnpm dev
```

- 前端地址：`http://localhost:3578`
- 后端地址：`http://localhost:7539`

## 📖 使用指南

1. **选择场景**：在首页选择一个感兴趣的英语场景（如“机场入境”）。
2. **开始对话**：点击“开始录音”并授予麦克风权限。
3. **沉浸练习**：像正常人一样对话即可。无需按键停止，系统会自动识别你的停顿并给出语音回复。
4. **实时字幕**：在右侧区域实时查看双方的对话转录，帮助你理解 AI 的表达。
5. **结束练习**：点击“结束练习”按钮，系统将为你生成一份专业的口语报告。

## ⚠️ 开发注意事项

- **音频格式**：本项目采用 16kHz, 16-bit, Mono PCM 格式作为实时通信的基础。
- **自动播放**：现代浏览器可能会拦截自动播放。如果无法听到声音，请点击页面任意位置或检查浏览器地址栏的自动播放权限。
- **API Quota**：实时语音接口涉及商业 API 调用，请确保你的 Aliyun 和 MiniMax 账户有足够的余额。

## 📄 License

Private - All rights reserved
