# Chat 系统架构文档

## 🎯 核心设计理念

**统一入口 + 双路径隔离**

- ✅ 在入口处统一收集所有初始数据
- ✅ 明确的数据源头，杜绝反复打包解包
- ✅ 手动挡（传统模式）和自动挡（Agent模式）完全隔离
- ✅ 两条路径互不侵犯，各自独立运行

---

## 📊 数据流架构

```
用户操作（发送/编辑/重新生成）
    ↓
【统一入口】request-builder.ts
    ├─ 收集用户输入
    ├─ 收集附加文件
    ├─ 收集对话历史
    ├─ 收集系统提示词
    └─ 生成 InitialRequestData（唯一数据源）
    ↓
【路由分发】request-router.ts
    ├─ 检查 agentConfig.enabled
    └─ 决定使用哪个处理器
    ↓
    ├─────────────────────┬─────────────────────┤
    ↓                     ↓                     ↓
🚗 手动挡            🚙 自动挡            （未来可扩展）
manual-mode         agent-mode           semi-auto-mode
    ↓                     ↓
直接调用 AI API      执行 Agent Pipeline
    ↓                     ↓
返回 RequestResult   返回 RequestResult + AgentComponents
    └─────────────────────┴─────────────────────┘
                         ↓
               conversation-actions.ts
               更新对话树，显示结果
```

---

## 📁 文件职责说明

### 核心类型定义
**`types.ts`**
- 定义 `InitialRequestData`（统一的初始数据格式）
- 定义 `RequestResult`（统一的返回格式）
- 定义 `StreamCallbacks`（流式回调接口）
- 定义 `RequestMode`（'manual' | 'agent'）

### 数据收集层
**`request-builder.ts`**
- 职责：**统一收集所有初始数据**
- 核心函数：
  - `buildInitialRequestData()` - 新消息的数据收集
  - `buildInitialRequestDataForRegenerate()` - 重新生成的数据收集
- 特点：
  - ✅ 只在入口处调用一次
  - ✅ 规范化所有数据格式
  - ✅ 后续流程不再做数据转换

### 路由层
**`request-router.ts`**
- 职责：**决定使用哪种处理模式**
- 核心函数：
  - `routeRequest()` - 返回 'manual' 或 'agent'
- 特点：
  - ✅ 清晰的判断逻辑
  - ✅ 易于扩展（添加新模式）

### 处理器层（完全隔离）

**`manual-mode-handler.ts`** 🚗 手动挡
- 职责：传统的直接 API 调用
- 核心函数：`executeManualMode()`
- 特点：
  - ✅ 简单直接，无中间优化
  - ✅ 保留所有现有功能
  - ✅ 与 Agent 模式完全隔离

**`agent-mode-handler.ts`** 🚙 自动挡
- 职责：执行 Agent Pipeline
- 核心函数：`executeAgentMode()`
- 特点：
  - ✅ 多步骤优化流程
  - ✅ 生成结构化任务结果
  - ✅ 与手动模式完全隔离

### 操作层
**`conversation-actions.ts`**
- 职责：响应用户操作，编排整个流程
- 核心函数：
  - `handleSendMessage()` - 发送新消息
  - `handleEditUserMessage()` - 编辑用户消息
  - `handleRegenerateMessage()` - 重新生成
  - `handleDeleteNode()` - 删除节点
- 新的流程：
  1. 调用 `buildInitialRequestData()` 收集数据
  2. 调用 `routeRequest()` 决定模式
  3. 调用对应的 handler 执行
  4. 更新对话树

### 状态管理层
**`conversation-manager.ts`**
- 职责：管理对话状态，协调所有操作
- 特点：只做状态管理，不做数据转换

---

## ✨ 重构前后对比

### ❌ 重构前的问题

```typescript
// 数据在多处被反复打包解包
content + tempContent + tempContentList 
  → components 
  → userContent + attachedFiles 
  → overrideAttachedFiles 
  → ？？

// 每层都在"猜测"数据在哪里
const content = userMessage.components?.userInput || userMessage.content
const files = overrideAttachedFiles ?? userMessage.components?.attachedFiles
```

### ✅ 重构后的优势

```typescript
// 统一入口，一次收集
const initialData = buildInitialRequestData(...)

// 数据确定，直接使用
const content = initialData.userInput
const files = initialData.attachedContents

// 不再需要回退逻辑 ?? || 
```

---

## 🔑 关键概念

### InitialRequestData（唯一数据源）
```typescript
interface InitialRequestData {
  userInput: string              // 用户输入
  attachedContents: string[]     // 附加文件列表
  conversationHistory: FlatMessage[]  // 对话历史
  systemPrompt: string           // 系统提示词
  aiConfig: AIConfig             // AI配置
  userMessageNode: FlatMessage   // 用户消息节点
  abortSignal: AbortSignal       // 中断信号
}
```

### RequestResult（统一返回格式）
```typescript
interface RequestResult {
  content: string                   // 生成的内容
  reasoning_content?: string        // 思考过程
  components?: MessageComponents    // 额外组件（Agent模式）
}
```

---

## 🚀 扩展性

### 添加新的处理模式（例如：半自动模式）

1. **创建新的 handler**
   ```typescript
   // semi-auto-mode-handler.ts
   export async function executeSemiAutoMode(
     data: InitialRequestData,
     callbacks: StreamCallbacks
   ): Promise<RequestResult> {
     // 实现半自动逻辑
   }
   ```

2. **扩展路由逻辑**
   ```typescript
   // request-router.ts
   export type RequestMode = 'manual' | 'agent' | 'semi-auto'
   
   export function routeRequest(data: InitialRequestData): RequestMode {
     if (shouldUseSemiAutoMode(data)) return 'semi-auto'
     if (shouldUseAgentMode(data)) return 'agent'
     return 'manual'
   }
   ```

3. **在 conversation-actions.ts 中调用**
   ```typescript
   if (mode === 'semi-auto') {
     result = await executeSemiAutoMode(data, callbacks)
   }
   ```

---

## 📝 注意事项

1. **InitialRequestData 是唯一数据源**
   - 所有处理器只读取它，不修改它
   - 不再有 tempContent, tempContentList, overrideAttachedFiles 等混乱概念

2. **两个 handler 的接口完全一致**
   - 输入：`InitialRequestData` + `StreamCallbacks`
   - 输出：`RequestResult`
   - 保证可替换性

3. **conversation-actions 只做编排**
   - 不做数据转换
   - 不做模式判断（交给 router）
   - 只负责流程控制

4. **已删除的旧文件**
   - ❌ `conversation-flow.ts` - 功能已整合到 conversation-actions
   - ❌ `message-generator.ts` - 功能已拆分到 router + handlers

---

## 🎓 设计原则总结

1. **单一职责原则** - 每个模块只做一件事
2. **依赖倒置原则** - 统一的接口，可替换的实现
3. **开闭原则** - 对扩展开放，对修改封闭
4. **明确的数据流** - 数据只流动一次，不反复转换
5. **隔离的执行路径** - 手动挡和自动挡完全独立

---

## 📞 维护指南

### 修改现有功能
- **修改手动模式** → 只改 `manual-mode-handler.ts`
- **修改 Agent 模式** → 只改 `agent-mode-handler.ts`
- **修改路由逻辑** → 只改 `request-router.ts`
- **修改数据收集** → 只改 `request-builder.ts`

### 添加新功能
- **新的处理模式** → 创建新的 handler，扩展 router
- **新的数据来源** → 在 `request-builder.ts` 中添加
- **新的回调类型** → 在 `types.ts` 中添加到 `StreamCallbacks`

### Debug 建议
- 在 `buildInitialRequestData` 处打断点，检查数据收集
- 在 `routeRequest` 处打断点，检查路由决策
- 在各 handler 入口打断点，检查执行路径

---

**最后更新**: 2025-10-29
**重构版本**: v2.0

