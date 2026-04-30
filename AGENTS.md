# AGENTS.md

## 项目概述

Speaking Coach 是一个 AI 英语口语陪练 Web 应用，帮助用户通过与 AI 对话练习真实英语场景。

## 设计规范

本项目采用 **Clay** 设计系统，详见 `DESIGN-clay.md`。

## 技术约束

### 禁止事项

- 禁止删除 `packages/shared` 中的类型定义
- 禁止修改 `apps/api/prisma/schema.prisma` 中的数据库模型
- 禁止硬编码 API URL 或 WebSocket URL（使用环境变量）
- 禁止使用 `require()` 语法，必须使用 ES Module `import`

### 必须遵循

- 所有 API 类型定义放在 `packages/shared/api-types.ts`
- 前端环境变量前缀为 `NEXT_PUBLIC_`
- Tailwind CSS 4 使用 `@theme inline` 模式
- Next.js 16 使用 App Router 架构

## 开发流程

### 添加新页面

1. 在 `apps/web/src/app/` 下创建页面
2. 使用 `useVoiceSession` hook 管理 WebSocket 连接
3. 使用 `useMediaRecorder` hook 管理录音
4. 页面类型定义参考 `packages/shared/api-types.ts`

### 添加 API 接口

1. 在对应的 Controller 中添加路由
2. 在 `packages/shared/api-types.ts` 添加请求/响应类型
3. 前端通过 `packages/shared` 导入类型

### 添加新场景

在 `packages/shared/scenarios.ts` 的 `scenarios` 数组中添加：

```typescript
{
  id: "unique_id",
  title: "场景名称",
  subtitle: "场景描述",
  icon: "plane|coffee|hotel|restaurant|briefcase|chat",
  level: "A1|A2|B1|B2|C1",
  role: "AI 角色",
  goal: "练习目标",
  openingLine: "开场白",
  systemPrompt: "系统提示词",
  targetExpressions: ["目标表达1", "目标表达2"]
}
```

### 图标使用

使用 [react-icons](https://github.com/react-icons/react-icons)，推荐 `Fa` (Font Awesome)。

## 环境变量

```env
# API 配置
MINIMAX_API_KEY=        # MiniMax API 密钥
MINIMAX_MODEL=          # 模型名称，默认 MiniMax-M2.7
PORT=7539               # 后端端口

# 前端环境变量
NEXT_PUBLIC_API_URL=    # 前端访问的后端地址
NEXT_PUBLIC_WS_URL=     # WebSocket 地址
```

## 启动命令

```bash
pnpm install   # 安装依赖
pnpm dev      # 开发模式（同时启动前后端）
pnpm build    # 生产构建
pnpm lint     # 代码检查
```

## 文件位置

- 前端入口：`apps/web/src/app/`
- 前端 Hooks：`apps/web/src/hooks/`
- 后端入口：`apps/api/src/`
- 共享类型：`packages/shared/`
- 场景配置：`packages/shared/scenarios.ts`
- API 类型：`packages/shared/api-types.ts`
- 数据库 Schema：`apps/api/prisma/schema.prisma`
- 设计规范：`DESIGN-clay.md`
