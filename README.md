# Speaking Coach

AI 英语口语陪练 Web 应用，帮助用户通过与 AI 对话练习真实英语场景。

## 功能特性

- **场景式对话练习**：6 个预设真实场景，涵盖日常对话、旅行、职场等
- **AI 智能陪练**：基于 MiniMax 大模型文本兜底，Aliyun Bailian 实时语音（新主路线）
- **多难度级别**：支持 A1-C1 六个 CEFR 难度级别
- **文字兜底练习**：通过 WebSocket 文本消息完成完整练习流程
- **麦克风管线**：浏览器可用 MediaRecorder 录音并发送音频 chunk 到后端日志管线
- **Aliyun Bailian Realtime**：新实时语音主路线，后端 spike 阶段进行中
- **MiniMax Realtime Spike**：后端文本事件连通性测试（quota 超限，保留参考，不再扩展）
- **会话报告**：练习结束后生成报告，分析错误和推荐表达

## 项目结构

```
speaking-coach/
├── apps/
│   ├── api/                    # NestJS 后端服务
│   │   ├── src/
│   │   │   ├── aliyun/        # Aliyun Bailian 实时语音 Provider（新主路线）
│   │   │   ├── minimax/       # MiniMax Chat（文本兜底+报告）& Realtime spike
│   │   │   ├── scenario/      # 场景管理模块
│   │   │   ├── session/       # 会话管理模块
│   │   │   ├── voice-session/ # WebSocket 语音会话
│   │   │   ├── report/        # 报告生成模块
│   │   │   └── prisma/        # 数据库服务
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
| AI 模型（文本） | MiniMax OpenAI-compatible Chat API | M2.7 |
| AI 模型（实时语音） | Aliyun Bailian / DashScope | qwen3.5-omni-flash-realtime |
| 包管理 | pnpm | 9.x |

## 当前实时语音方向

> **重要：实时语音主路线已切换到 Aliyun Bailian / DashScope。**

### 为什么切换？

MiniMax Realtime 是原定实时语音方案。后端文本事件 spike 已完成，但 MiniMax key 当前遭遇 `usage limit exceeded` quota 限制，无法继续推进。

### 新主路线：Aliyun Bailian / DashScope

| 属性 | 值 |
|------|----|
| Provider | Aliyun Bailian / DashScope |
| 模型 | `qwen3.5-omni-flash-realtime` |
| 对话模式 | manual |
| 音频输入格式 | PCM |
| 音频输出格式 | MP3（优先）|
| 首个测试场景 | `airport_immigration` |

### 实施阶段

**当前阶段：Step 5a — 后端 Aliyun Spike（完成）**

- [x] `apps/api/src/aliyun/aliyun-bailian-realtime.provider.ts`
- [x] `apps/api/src/aliyun/aliyun-realtime-spike.ts`
- [x] `pnpm --filter api aliyun:spike` 通过

**后续阶段：Step 5b — 前端 PCM 音频接入（已完成）**

- [x] 前端通过 AudioWorklet 采集 PCM
- [x] 前端发送 `audio_chunk` 到后端
- [x] 后端转发 PCM 到 Aliyun Bailian Realtime
- [x] 后端接收 AI 音频并推送到前端
- [x] 前端播放 AI 语音

### MiniMax 保留用途

MiniMax Chat Provider **保留，不删除**，用于：
- 文字兜底对话（`text_message` → MiniMax Chat → `transcript`）
- 练习报告生成
- 纠错摘要

MiniMax Realtime spike 代码**保留作参考，不再扩展**。

---

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

编辑 `.env` 文件（参考 `.env.example`）：

```env
PORT=7539
DATABASE_URL="file:./dev.db"

# 语音模式
VOICE_MODE=realtime_voice
REALTIME_PROVIDER=aliyun_bailian

# Aliyun Bailian — 新实时语音主路线
ALIYUN_DASHSCOPE_API_KEY=your_aliyun_key_here
ALIYUN_REALTIME_MODEL=qwen3.5-omni-flash-realtime
ALIYUN_REALTIME_REGION=cn-beijing
ALIYUN_AUDIO_INPUT_FORMAT=pcm
ALIYUN_AUDIO_OUTPUT_FORMAT=mp3
ALIYUN_DIALOG_MODE=manual

# MiniMax Chat — 文本兜底 + 报告生成（保留）
MINIMAX_API_KEY=your_minimax_key_here
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000

# 前端
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

# Aliyun Bailian Realtime 后端连通性 spike 测试（新主路线）
pnpm --filter api aliyun:spike

# MiniMax Realtime 文本事件连通性测试（spike 参考，quota 超限）
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

- **NestJS 模块化设计**: ScenarioModule, SessionModule, VoiceSessionModule, AliyunModule, MinimaxModule, ReportModule, PrismaModule
- **Prisma ORM**: 数据库抽象层
- **WebSocket**: 支持文本兜底会话、麦克风 audio_chunk 接收日志；实时语音将通过 Aliyun Bailian 转发
- **MiniMax Chat 集成**: 文本练习和报告生成使用 OpenAI-compatible Chat API（保留）
- **Aliyun Bailian 集成**: 新实时语音主路线，当前 backend-only spike 阶段

### Aliyun Bailian Realtime Spike（当前任务）

```bash
pnpm --filter api aliyun:spike
```

此脚本验证后端能用 `ALIYUN_DASHSCOPE_API_KEY` 连接 Aliyun Bailian Realtime WebSocket，发送文本事件，并接收响应事件。不经过前端，不发送浏览器录音。

### MiniMax Realtime Spike（参考，不再扩展）

```bash
pnpm --filter api realtime:test
```

原有 MiniMax Realtime 后端文本事件连通性测试。当前 MiniMax key quota 超限，保留作参考代码，不再主动扩展。

### Audio 兼容性说明

当前浏览器录音使用 `MediaRecorder`，输出 `audio/webm;codecs=opus`。Aliyun Bailian Realtime 需要 PCM 格式输入，WebM/Opus chunk 不可直接转发。

下一步前端音频接入计划：

- 使用 Web Audio API / AudioWorklet 捕获麦克风 PCM
- 转 mono，采样率按 Aliyun 要求
- Float32 PCM 转 Int16 PCM
- base64 后通过现有 WebSocket 发送 `audio_chunk`
- 后端转发 PCM 到 Aliyun Bailian Realtime

不在 MVP 中引入后端 ffmpeg 转码链路。

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
PORT=7539
DATABASE_URL=postgresql://user:pass@host:5432/db

VOICE_MODE=realtime_voice
REALTIME_PROVIDER=aliyun_bailian

ALIYUN_DASHSCOPE_API_KEY=<your_aliyun_key>
ALIYUN_REALTIME_MODEL=qwen3.5-omni-flash-realtime
ALIYUN_REALTIME_REGION=cn-beijing
ALIYUN_AUDIO_INPUT_FORMAT=pcm
ALIYUN_AUDIO_OUTPUT_FORMAT=mp3
ALIYUN_DIALOG_MODE=manual

MINIMAX_API_KEY=<your_minimax_key>
MINIMAX_CHAT_BASE_URL=https://api.minimaxi.com/v1
MINIMAX_CHAT_MODEL=MiniMax-M2.7
MINIMAX_CHAT_FAST_MODEL=MiniMax-M2.7-highspeed
MINIMAX_CHAT_TIMEOUT_MS=8000
MINIMAX_REALTIME_URL=wss://api.minimax.chat/ws/v1/realtime
MINIMAX_REALTIME_MODEL=abab6.5s-chat

NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

## License

Private - All rights reserved
