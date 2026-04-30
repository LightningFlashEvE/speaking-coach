# Speaking Coach

AI 英语口语陪练 Web 应用，帮助用户通过与 AI 对话练习真实英语场景。

## 功能特性

- **场景式对话练习**：6 个预设真实场景，涵盖日常对话、旅行、职场等
- **AI 智能陪练**：基于 MiniMax 大模型，提供即时反馈和纠正
- **多难度级别**：支持 A1-C1 六个 CEFR 难度级别
- **文字兜底练习**：当前 MVP 先通过 WebSocket 文本消息完成可用练习流程
- **麦克风管线**：浏览器可用 MediaRecorder 录音并发送 500ms 音频 chunk 到后端日志管线
- **Realtime 技术验证**：后端提供 MiniMax Realtime 文本事件连通性测试，尚未接入前端音频
- **会话报告**：练习结束后生成基础报告，分析错误和推荐表达

## 项目结构

```
speaking-coach/
├── apps/
│   ├── api/                    # NestJS 后端服务
│   │   ├── src/
│   │   │   ├── minimax/       # MiniMax API 集成
│   │   │   ├── scenario/       # 场景管理模块
│   │   │   ├── session/        # 会话管理模块
│   │   │   ├── voice-session/  # WebSocket 语音会话
│   │   │   └── prisma/         # 数据库服务
│   │   └── prisma/
│   │       └── schema.prisma   # 数据库模型
│   └── web/                    # Next.js 前端
│       └── src/
│           ├── app/            # 页面路由
│           └── hooks/          # 自定义 Hooks
├── packages/
│   └── shared/                 # 共享类型和配置
│       ├── types.ts            # TypeScript 类型定义
│       ├── scenarios.ts         # 场景数据配置
│       └── api-types.ts        # API 请求/响应类型
└── pnpm-workspace.yaml         # pnpm 工作空间配置
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js | 16.2.4 |
| UI 框架 | React | 19.2.4 |
| 样式 | Tailwind CSS | 4.x |
| 后端框架 | NestJS | 11.x |
| 数据库 | Prisma + SQLite | 6.x |
| AI 模型 | MiniMax OpenAI-compatible Chat API | M2.7 |
| 包管理 | pnpm | 9.x |

## 快速开始

### 环境要求

- Node.js >= 22 < 25
- pnpm >= 9

### 1. 克隆并安装依赖

```bash
git clone <repository-url>
cd speaking-coach
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# MiniMax Chat API 配置（后端专用；留空时使用本地 mock 回复）
MINIMAX_API_KEY=your_api_key_here
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000

# MiniMax Realtime 配置（后端专用；当前仅用于文本事件连通性测试）
MINIMAX_REALTIME_URL=wss://api.minimax.chat/ws/v1/realtime
MINIMAX_REALTIME_MODEL=abab6.5s-chat

# 服务器端口（可选，默认 7539）
PORT=7539

# 数据库（开发环境默认使用 SQLite）
DATABASE_URL="file:./dev.db"

# 前端环境变量（用于生产部署）
NEXT_PUBLIC_API_URL=http://localhost:7539
NEXT_PUBLIC_WS_URL=ws://localhost:7539
```

### 3. 启动开发服务器

```bash
pnpm dev
```

这会同时启动前端和后端：

| 服务 | 地址 |
|------|------|
| 前端 (Next.js) | http://localhost:3578 |
| 后端 API (NestJS) | http://localhost:7539 |
| WebSocket | ws://localhost:7539 |

### 4. 构建生产版本

```bash
pnpm build
pnpm start
```

## 开发命令

```bash
# 开发模式（同时启动前后端）
pnpm dev

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# MiniMax Realtime 文本事件连通性测试
pnpm --filter api realtime:test

# 启动生产版本
pnpm start
```

## 应用页面

### 首页 (`/`)

展示所有可用的练习场景卡片，点击即可创建新会话。

### 会话页面 (`/session/[sessionId]`)

- 左侧显示场景信息和难度
- 中间是对话区域，实时显示字幕
- 底部输入栏：文本输入、麦克风录音、提示、结束会话
- 当前 MVP 支持麦克风 chunk 上报；实时语音模型音频输入暂未启用

### 报告页面 (`/report/[sessionId]`)

- 显示综合得分
- 对话记录回顾
- 错误纠正和建议

## API 接口

### 会话管理

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/sessions` | 创建新会话 |
| GET | `/api/sessions/:sessionId` | 获取会话详情 |
| PATCH | `/api/sessions/:sessionId/end` | 结束会话 |
| GET | `/api/sessions/:sessionId/report` | 获取或生成练习报告 |

### 场景管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/scenarios` | 获取所有场景列表 |

### WebSocket

| 路径 | 描述 |
|------|------|
| `/ws/voice-sessions/:sessionId` | 实时语音会话 |

### 请求/响应示例

**创建会话**

```bash
POST /api/sessions
Content-Type: application/json

{
  "scenarioId": "coffee_order",
  "level": "A1"
}
```

响应：

```json
{
  "sessionId": "clx123abc...",
  "scenarioId": "coffee_order"
}
```

**WebSocket 消息格式**

客户端发送：

```json
{ "type": "start_session", "scenarioId": "coffee_order", "level": "A1" }
{ "type": "audio_chunk", "data": "<base64>", "mimeType": "audio/webm;codecs=opus" }
{ "type": "text_message", "text": "Hi, I'd like a latte please." }
{ "type": "end_session" }
```

服务端推送：

```json
{ "type": "state", "state": "listening" }
{ "type": "transcript", "role": "assistant", "text": "Hi there! What can I get for you today?", "isFinal": true }
{ "type": "error", "message": "Session not found" }
```

## 可用场景

| 场景 ID | 场景名称 | 难度 | 描述 |
|---------|----------|------|------|
| `airport_immigration` | 机场入境 | A2 | 练习海关问答和旅行说明 |
| `coffee_order` | 咖啡店点单 | A1 | 练习点咖啡和甜点 |
| `hotel_checkin` | 酒店入住 | A2 | 练习酒店前台办理入住 |
| `restaurant_order` | 餐厅点餐 | B1 | 练习西餐厅点餐 |
| `job_interview` | 工作面试 | B2 | 练习英语工作面试 |
| `daily_chat` | 日常闲聊 | A2 | 轻松随意交流 |

## 数据库模型

### PracticeSession

| 字段 | 类型 | 描述 |
|------|------|------|
| id | String | 会话 ID (CUID) |
| scenarioId | String | 场景 ID |
| userLevel | String | 用户难度级别 |
| startedAt | DateTime | 开始时间 |
| endedAt | DateTime? | 结束时间 |
| transcriptJson | Json? | 对话记录 |
| reportJson | Json? | 练习报告 |

### Message

| 字段 | 类型 | 描述 |
|------|------|------|
| id | String | 消息 ID |
| sessionId | String | 所属会话 ID |
| role | String | 角色 (user/assistant) |
| text | String | 消息内容 |
| isFinal | Boolean | 是否最终回复 |
| createdAt | DateTime | 创建时间 |

## 架构说明

### 前端架构

- **Next.js 16** App Router 架构
- **Tailwind CSS 4** 原子化 CSS
- **自定义 Hooks**:
  - `useVoiceSession`: WebSocket 连接和会话管理
  - `useMediaRecorder`: 麦克风录音控制

### 后端架构

- **NestJS 模块化设计**: ScenarioModule, SessionModule, VoiceSessionModule, PrismaModule
- **Prisma ORM**: 数据库抽象层
- **WebSocket**: 当前支持文本兜底会话和麦克风 audio_chunk 接收日志，实时语音模型音频转发留到后续阶段
- **MiniMax 集成**: 文本练习和报告使用 OpenAI-compatible Chat API；Realtime 当前仅提供后端文本事件连通性测试

### MiniMax Realtime Spike

后端 Realtime 测试入口：

```bash
pnpm --filter api realtime:test
```

这个测试只验证后端能用 `MINIMAX_API_KEY` 连接 `MINIMAX_REALTIME_URL`，发送文本事件，并接收 MiniMax Realtime 事件。它不会经过前端，也不会发送浏览器录音。

当前事件格式按 Realtime WebSocket 常见事件模型实现：

- `session.update`
- `conversation.item.create`
- `response.create`

日志只输出事件类型和安全摘要，不打印 API key。

### Audio Compatibility Decision

当前浏览器录音使用 `MediaRecorder`，常见输出是 `audio/webm;codecs=opus`。MiniMax Realtime 语音输入目标格式是 PCM 16-bit、24kHz、mono、base64，所以不能把当前 WebM/Opus chunk 直接转发给 MiniMax Realtime。

下一步推荐采用 Option A：前端 PCM capture。

- 使用 Web Audio API 或 AudioWorklet 捕获麦克风输入
- 转 mono
- 重采样到 24kHz
- Float32 PCM 转 Int16 PCM
- base64 后通过现有 WebSocket 发送
- 后端只转发 PCM frame 到 MiniMax Realtime

暂不选择后端转码作为 MVP 默认方案，因为它会引入 ffmpeg 或 Node 音频处理链路，部署和延迟成本更高。

### 共享包

`@speaking-coach/shared` 被前后端共用，包含：

- TypeScript 类型定义
- 场景配置数据
- API 类型接口

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t speaking-coach ./apps/web

# 或使用 docker-compose
docker-compose up
```

### 环境变量（生产）

```env
MINIMAX_API_KEY=<your_key>
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000
MINIMAX_REALTIME_URL=wss://api.minimax.chat/ws/v1/realtime
MINIMAX_REALTIME_MODEL=abab6.5s-chat
PORT=7539
DATABASE_URL=postgresql://user:pass@host:5432/db
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

## License

Private - All rights reserved
