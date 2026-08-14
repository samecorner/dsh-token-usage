# dsh-token-usage

DSH（DeepSeek Harness）Web GUI 的 **Token 用量分析插件**：在会话顶部的 Tab 栏（Chat / Trajectory 之后）新增一个「Token 用量」页，展示整轮对话的 token 明细与上下文占用。

灵感来自 pi-web-token-usage（pi-web 的同类插件），但完全按 DSH 的插件契约实现：

| 能力 | 数据来源 |
|---|---|
| 总 token / 计费 token / 输出 / 缓存读取 KPI | host 端 tokenUsage projection（token-meter 已内置在 dsh web） |
| 上下文占用 %（projected / window） | host 端 contextPressure projection |
| 轮次 / 步数 | host 端 sessionStats projection |
| 构成明细表（输入/缓存读/缓存写/输出/推理） | 上述 tokenUsage |
| 按模型拆分 + 逐轮明细 + 堆叠条形图 | 客户端从会话事件窗口折叠 assistant/message 的 usage（ConversationNode + View target） |
| 复制 Markdown 报告 / 加载更早记录 | 面板按钮 |

## 安装（到本机 npx 起的 dsh web）

```bash
# 1. 构建（需要 node >= 18；依赖只来自 npm 公开包，不需要 DSH 源码）
npm install
npm run build        # 产出 lib/client.js + lib/index.js

# 2. 挂进运行中 GUI 的插件解析面（$DSH_HOME/profiles/node_modules）
mkdir -p ~/.dsh/profiles/node_modules/@deepseek-ai
ln -sfn "$(pwd)" ~/.dsh/profiles/node_modules/@deepseek-ai/dsh-client-ui-token-usage

# 3. 在 ~/.dsh/profiles/web/cordis.patch.yml 追加：
#    - insert:
#        - id: ui-token-usage
#          name: '@deepseek-ai/dsh-client-ui-token-usage'

# 4. 重启 dsh web（launcher 停止再启动，或 kill 后重跑 dsh web）
```

重启后打开任意会话，顶部 Tab 出现「Token 用量」。

## 开发

```bash
npm run typecheck    # tsc --noEmit（类型来自 npm 上的 @deepseek-ai/*@0.1.0-rc.6）
npm run build        # esbuild：浏览器 bundle + node half
node scripts/smoke-loader.mjs   # 模拟 DSH 模块表验证产物形态（不启动 web）
node scripts/render-test.mjs && node scripts/.tmp/render-test.bundle.mjs  # SSR 渲染冒烟（抓运行时错误）
```

修改源码后重新 build，重启 dsh web 生效（或使用 dsh 的 HMR 机制热更）。

> **写插件前先读**：[`docs/client-plugin-dev-guide.zh.md`](docs/client-plugin-dev-guide.zh.md) —— Web 客户端插件开发手册（官方 Demo 目录、完整流程、踩坑清单含 `module is not defined` 事故的修复对照）。

### 包结构

```
dsh-token-usage/
├── src/
│   ├── index.ts                    # host 端空入口
│   └── client/
│       ├── index.ts                # apply：注册 locale / 节点定义 / 视图 / Tab
│       ├── token-usage-contract.ts # 视图数据类型 + ConversationViewSnapshotMap 合并
│       ├── token-usage-step-definition.ts  # assistant/message → usage 节点（last-wins）
│       ├── token-usage-snapshot-builder.ts # 折叠成逐轮明细 + 总计
│       ├── TokenUsageView.tsx      # 面板组件
│       ├── styles.ts               # 自包含样式（免 CSS modules 管线）
│       └── locales.ts              # 中/英文案
├── build.mjs                       # esbuild 打包（匹配 DSH client bundle 格式）
└── package.json
```

## GitHub 仓库注意事项

- 包名目前是 @deepseek-ai/dsh-client-ui-token-usage，便于零配置加载；若不想用官方 scope，
  改名即可（package.json name + build.mjs 里的 ID + 安装目录），Loader 不挑 scope。
- 依赖只有 devDependencies（类型 + 构建工具），运行时零依赖（只 external 平台模块）。
- 版本号建议发版时改成与目标 DSH release 线一致的 rc 版本。

## 工作原理（DSH 插件机制速记）

- 一切皆 Cordis 插件；浏览器端插件 = 一个 conversation.view slot 条目（id/order/label/组件）。
- host 端 token-meter / session-stats 已内置并挂载，把 tokenUsage / contextPressure /
  contextBreakdown / sessionStats projection 推到客户端 useProjection。
- 逐轮数据：注册 conversationEvents 节点定义（匹配 assistant/message 的 usage）+ conversationViews
  视图 target，客户端窗口分页自动维护快照。
- 打包格式：lib/client.js 必须带 window.__ModuleLoader__.load({ id, factory }) 包装；
  react / cordis / ui-slots 等平台模块保持 external。

## 已知限制

- 逐轮明细只覆盖「窗口内已装配且带 usage 的 assistant/message」；被取消的步、以及 usage 缺失的调用
  不出现在逐轮表（整轮合计仍以 host projection 为准，两者口径可能略有差异）。
- 推理 token 计入输出（与 token-meter 口径一致）；无成本估算（DSH 不记录单价，避免猜测计费）。
- 上下文占用显示的是 token-meter 的近似投影（projectedTokens / contextWindow），非计费口径。

## License

MIT
