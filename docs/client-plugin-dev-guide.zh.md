# DeepSeek Harness（`dsh`）Web 客户端插件开发手册

> 适用对象：**浏览器端 UI 插件**（在 dsh Web GUI 里加 Tab、面板、渲染会话节点的那类插件，如 `dsh-token-usage`）。
> 这是对 `dsh-plugin-dev-guide.zh.md`（host 侧 Cordis 插件速查）的**补充**：host 插件三形态/生命周期/事件等基础概念请先读那份。
> 事实来源：`deepseek-harness` 仓库源码 + `docs/subsystems/client-modules.md` + `docs/cookbook/adding-a-conversation-node.md` + 本工作区 `dsh-token-usage` 实战（含一次线上踩坑的修复记录）。

---

## 0. 两种插件形态，先分清

| 形态 | 运行位置 | 入口 | 声明 |
|---|---|---|---|
| host 插件 | Node（agent 主循环、工具、适配器……） | `lib/index.js` 的 `apply(ctx)` | 普通 Cordis 插件，`cordis.yml` 挂载 |
| **web 客户端插件** | **浏览器**（Web GUI 里跑 React） | `lib/client.js` 的浏览器 bundle | package.json 里 `dsh.client` 声明 |

一个 UI 插件其实是**双面包**：

```
@deepseek-ai/dsh-client-ui-xxx/
├── lib/index.js      # node half：host loader 挂载它（空 apply 即可，纯浏览器插件）
└── lib/client.js     # client half：浏览器执行，真正干活的部分
```

host loader 只负责把 node half 挂起来；`client-modules` 服务扫描到 `dsh.client` 声明后，才会把 client half 编进浏览器的启动图（`window.__DSH_BOOT__`），由浏览器按需拉取执行。

---

## 1. 五分钟架构：客户端插件怎么跑起来

1. **host 侧**（`packages/client/modules/src/index.ts`）：扫描 host loader 的 entries，找到声明了 `dsh.client` 的包 → 读 `exports["./client"]` 定位 bundle → 组成 `WebBootEntry` 行（`{ id(=包名), url: '/plugins/<id>/client.js?rev=<内容hash>', rev, inject?, immediately? }`）→ 以 `window.__DSH_BOOT__` 形式注入 index.html 的 `<head>`。
2. **浏览器侧**（`packages/client/modules/src/client/system.ts`）：`ClientModuleSystem` 一张 lazy CJS 表。bundle 脚本执行时只做一件事——`window.__ModuleLoader__.load({ id, factory })` 把工厂**登记**进表里，除此之外没有任何副作用。真正的副作用（注册 slot、注入样式）都住在 `factory` 闭包里，在**首次 require/import 物化**时才跑。
3. **物化**：loader 以 `factory(require)` 调用工厂，工厂里的 `require` 由模块表应答，解析顺序固定：**平台 seed（react/cordis 等）→ shell 自有模块 → 已物化记录 → 已登记的其他工厂（递归物化）→ 大声抛错**。最后那个抛错是"跨插件 value import"构建期门禁的运行期镜像。
4. **boot 完成**：`loader.await()` + 全 fiber ACTIVE 扫描；任何一个 entry import 失败 / apply 抛错 / 缺服务 PENDING，就整页停在 "Failed to load plugins"。

**推论（全程适用的三条铁律）**：

- **跨插件协作只能走 cordis 服务**（`ctx.slots` / `ctx.conversationEvents` / `ctx.locale` …），禁止 value-level 跨插件 import（类型 import 会被擦除，是安全的）。
- **平台模块必须 external**，bundle 里不能内联 react/cordis 的副本，否则出现两份运行时实例。
- **注册即 effect**：`ctx.effect(...)` / `ctx.slots.register` 等注册的资源随插件卸载自动回滚，不需要手写清理。

---

## 2. 官方参考目录（Demo 插件清单）

### 2.1 仓库内官方示例（`<repo>/packages/client/…`）

| 参考 | 路径 | 学什么 |
|---|---|---|
| **会话 Tab 插件（与 dsh-token-usage 同形态，首选样板）** | `packages/client/ui-trajectory` | node half、client apply 样板、节点定义、视图 builder、CSS modules、跨包类型合并 |
| 根布局 + 声明子 slot + 服务面 | `packages/client/ui-layout` | register 一个 `single` slot、`declare module` 合并 `SlotMap`、在 `@deepseek-ai/cordis` 的 `Context` 上声明服务 |
| conversation.view slot 契约（Tab 环） | `packages/client/ui-conversation/src/client/contract/slots.ts` | `conversation.view` 是 `{ kind: 'list'; scope: 'session' }`，按 `order` 升序渲染 |
| 节点定义如何注册（cookbook） | `docs/cookbook/adding-a-conversation-node.md` | Definition 的 match/start/update/buildViewNode 写法 |
| **打包预设（bundle 的官方蓝本，含 banner/intro/footer）** | `packages/client/tsdown.client.ts` | 见 §6，**§6 的坑就是对照它发现的** |
| 平台模块表（external 唯一事实源） | `packages/client/web/src/platform.ts` | react 家族 + cordis + ui-slots + web-react + ui-primitives + ui-attachment + schema-form |
| 模块系统 node half（扫描/组图/serve） | `packages/client/modules/src/index.ts` | `dsh.client` 声明如何被解析、boot 图怎么生成 |
| 模块系统 browser half（loader 表） | `packages/client/modules/src/client/system.ts` | factory 怎么被调用（**只传 require**）、物化/缓存/循环检测 |
| **bundle 形态的官方测试** | `packages/client/ui-trajectory/tests/client-bundle.client.spec.ts` | 官方如何验证产物的 handoff/require/exports（§7 冒烟测试即仿此） |
| 相关官方文档 | `docs/subsystems/client-modules.md`、`docs/cookbook/adding-a-package.md`、`docs/development.md` | 协议细节、打包、开发环境 |

### 2.2 仓库外独立插件示例（本工作区）

| 参考 | 路径 | 说明 |
|---|---|---|
| Token 用量分析 Tab（本仓库本体） | 同仓库 `src/`、`build.mjs`、`scripts/` | 不 fork 仓库、以 esbuild 独立构建、经 profile `file:` 依赖安装的完整实战；§6/§8 的坑都来自它 |

### 2.3 快速定位清单（写代码时对照）

```bash
# 在一个 client 包内：
ls packages/client/ui-trajectory/src/client/        # 标准文件布局
sed -n '1,60p' packages/client/ui-trajectory/src/client/index.ts   # apply 样板
sed -n '255,290p' packages/client/tsdown.client.ts  # banner/intro/footer 三件套
cat packages/client/web/src/platform.ts             # external 平台模块表
grep -n 'DshClientDeclaration' packages/client/modules/src/index.ts  # dsh.client 契约
```

---

## 3. 包结构解剖（对照 ui-trajectory / dsh-token-usage）

```text
dsh-my-ui-plugin/
├── package.json                # dsh.client 声明 + exports["./client"]（§4）
├── tsconfig.json               # module ESNext、moduleResolution bundler、jsx react-jsx、
│                               #   allowImportingTsExtensions、verbatimModuleSyntax
├── build.mjs                   # esbuild：node half + client bundle（§6）
├── .gitignore                  # node_modules/ lib/
└── src/
    ├── index.ts                # node half：/** Host loader entry ... */ export function apply() {}
    └── client/
        ├── index.ts            # apply(ctx)：locale + 节点定义 + 视图 + slot 注册（§5）
        ├── locales.ts          # NS 常量 + zh/en 词表
        ├── <name>-contract.ts  # 视图数据类型 + declare module 合并快照表
        ├── <name>-step-definition.ts    # conversationEvents 节点定义（事件 → 事实节点）
        ├── <name>-snapshot-builder.ts   # conversationViews 视图 builder（折叠成快照）
        ├── <Name>View.tsx      # 面板组件（useSession / useProjection / props 注入）
        └── styles.ts           # 自包含样式（免 CSS modules 管线）；仓库内包用 .module.css
```

关键点：

- **node half 只是占位**：`export function apply(): void {}`，纯浏览器插件没有 host 行为。但**不能没有**——host loader 要 import 它。
- **包内相对导入用显式 `.ts` 后缀**（`verbatimModuleSyntax` + `allowImportingTsExtensions`，esbuild 直接吃 TS）。
- **跨包 import 一律 `import type`**：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-runtime/client`、`@deepseek-ai/dsh-client-ui-conversation/client` 在你的源码里只允许出现在 `import type`（或 `import type {}` 副作用合并）里。这是为了把 `declare module` 合并和类型带进编译，同时让 bundle 里一个 value import 都不留。

---

## 4. package.json 关键字段

```jsonc
{
  "name": "@deepseek-ai/dsh-client-ui-my-plugin",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".":        { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" },   // ← client-modules 靠它定位 bundle
    "./package.json": "./package.json"
  },
  "dsh": {
    "client": {
      "inject": [                                    // 包名数组 = 图依赖边（参考二期加载）
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-conversation"
      ],
      "platform": "web"                              // 非 "web" 会被扫描器忽略
      // "immediately": true                        // 可选：boot 一阶段预取；UI 插件一般不加（懒加载）
    }
  },
  "files": ["lib/index.js", "lib/client.js", "README.md"],
  "devDependencies": {
    "esbuild": "^0.25.0",
    "typescript": "^5.5.0",
    "react": "^18.2.0", "@types/react": "~18.3.1",
    "@deepseek-ai/cordis": "0.1.0-rc.6",             // ← 版本必须与运行的 dsh 一致（见踩坑 #4）
    "@deepseek-ai/dsh-client-runtime": "0.1.0-rc.6",
    // ... 你类型依赖到的 @deepseek-ai/* 包
  }
}
```

**版本匹配铁律**：devDependencies 里的 `@deepseek-ai/*` 类型版本，必须等于你的目标 `dsh web` 版本。校验：`node -e "console.log(require('/…/node_modules/@deepseek-ai/dsh/package.json').version)"`（或 `dsh --version`）。类型版本漂移的典型症状：字段 undefined、定义对不上——**不会在构建期报错，而是跑到浏览器里才炸**。

---

## 5. apply(ctx) 标准样板（conversation.view Tab）

以 ui-trajectory / dsh-token-usage 为准：

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only：把 locale 插件的 Context 合并（ctx.locale）拉进程序
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only：'conversation.view' SlotMap 行（由拥有者包声明）必须在程序里，register 才能通过类型
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { en, NS, zh } from './locales.ts'
import { registerMyView } from './my-snapshot-builder.ts'
import { registerMyStepDefinition } from './my-step-definition.ts'
import { MyView, type MyViewInjected } from './MyView.tsx'

/** 需要的服务：conversation slot、两个 registry、Session 分页、locale。缺一个就 PENDING。 */
export const inject = ['slots', 'conversationEvents', 'conversationViews', 'sessions', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')
  const t = ctx.locale.bind(NS)                       // 绑定命名空间
  registerMyStepDefinition(ctx)                       // 事件 → 事实节点
  registerMyView(ctx)                                 // 视图 target builder
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'my-view',
    order: 20,                                        // 升序排 Tab；chat=0/trajectory=10
    locale: NS,
    label: () => t('view.myView'),                    // 必须用 thunk，跟随运行时语言切换
    inject: (sessionId: SessionId): MyViewInjected => {  // 业务注入面（可选）
      // 返回组件会用到的回调（loadOlder 之类）
    },
  }, MyView))
}
```

要点：

- `label` 传函数而不是字符串，语言切换时才不用重新注册。
- `ctx.slots.inject('conversation.view', () => …)` 的**注册包在 effect 触发器里**——插件卸载时 Tab 自动消失。
- 节点定义（`conversationEvents.register`）负责把会话事件（如 `assistant/message` 带 `usage`）折叠成**带稳定 id 的事实节点**（last-wins 语义：同名 `(turn, step)` 重试以新盖旧）；视图 builder（`conversationViews.register`）把窗口里的节点折叠成快照，`useSession(s => s.views.get('myView'))` 消费。
- 想深挖节点定义/事件回放的约束（稳定业务 id、可重放、不能依赖活内存），读 `docs/cookbook/adding-a-conversation-node.md`。

---

## 6. 构建：esbuild 打包蓝本（**本手册最重要的一节**）

官方用 tsdown（`tsdown.client.ts`），独立插件用 esbuild 对齐同一产物形态。**产物必须满足**：

```
window.__ModuleLoader__.load({ id: "<包名>", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
…cjs 代码（含 module.exports = __toCommonJS(...)）…
return module.exports; } });
//# sourceMappingURL=client.js.map
```

逐项对照（左=官方 tsdown，右=esbuild）：

| tsdown outputOptions | esbuild | 必须 |
|---|---|---|
| `banner: 'window.__ModuleLoader__.load({ id, factory: (require) => {'` | `banner.js` 同内容 | ✅ |
| `intro: 'var module = { exports: {} }; var exports = module.exports;'` | **塞进 banner 开头（factory 体内）** | ✅ **最容易漏** |
| `footer: 'return module.exports; } });'` | `footer.js` 同内容 | ✅ |
| `external: [...PLATFORM_MODULES, RUNTIME_STORE_EXEMPTION]` | `external` 同表（`@deepseek-ai/dsh-client-runtime/client` 是免拆例外，也要 external） | ✅ |
| `define` 的 NODE_ENV | `define: { 'process.env.NODE_ENV': … }` | 视依赖而定 |

```js
// build.mjs（要点节选）——dsh-token-usage 实战版
const ID = '@deepseek-ai/dsh-client-ui-my-plugin'
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form', '@deepseek-ai/dsh-client-runtime/client',
]

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',          // ← 必须是 cjs：产物按 lazy CJS 表运行
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  external: PLATFORM_MODULES,
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production') },
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;` },
  footer: { js: 'return module.exports; } });' },
})
```

> **为什么必须有 `var module = { exports: {} }`（踩坑 #1，本次线上事故）**：
> 官方 loader（`client/system.ts`）物化时调用 `factory(require)`——**只传 require，不传 module**。而 esbuild 的 CJS 输出会直接写 `module.exports = __toCommonJS(...)`，工厂体内 `module` 未声明 → 浏览器抛 `ReferenceError: module is not defined` → 整页 "Failed to load plugins"。官方 tsdown 用 `intro` 兜住这个声明，esbuild 没有 intro，必须并进 banner。**漏掉它的后果不是"功能缺失"，是启动直接失败。**

检查产物是否合格：

```bash
head -c 300 lib/client.js    # 应看到 load({...}) 与 var module 声明
grep -c 'var module = { exports' lib/client.js   # ≥ 1
grep -o 'require("[^"]*")' lib/client.js | sort -u   # 只该有平台模块（本插件通常只剩 react 系）
```

---

## 7. 冒烟验证：不启动 web 先验产物

仿照官方 `client-bundle.client.spec.ts`，用模拟 loader 直接跑 `lib/client.js`（Node 里用 `vm` 执行即可，不依赖 jsdom）：

```js
// smoke-loader.mjs —— 验证点：登记 id / 物化不抛 / 导出 apply+inject / require 只命中白名单
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync('lib/client.js', 'utf8')
let registered = null
const context = {
  window: { __ModuleLoader__: { load: ({ id, factory }) => { registered = { id, factory } } } },
  console,
}
vm.createContext(context)
vm.runInContext(code, context)
if (registered === null) throw new Error('bundle 没有调用 __ModuleLoader__.load')
console.log('registered id:', registered.id)

const seed = { 'react': { default: {} }, 'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'f' } }
const seen = new Map()
// 与 ClientModuleSystem.materialize 一致：factory 只收到 require
const exports_ = registered.factory((spec) => {
  seen.set(spec, (seen.get(spec) ?? 0) + 1)
  if (seed[spec] !== undefined) return seed[spec]
  throw new Error(`require("${spec}") missed the module table`)
})
console.log('requires:', [...seen.keys()].join(', '))
if (typeof exports_.apply !== 'function' || !Array.isArray(exports_.inject)) {
  throw new Error('exports 缺 apply/inject')
}
console.log('SMOKE TEST PASSED')   // 然后在浏览器里再验 UI
```

> 这个测试在**修复前后对照**上极有价值：旧产物在这里抛 `ReferenceError: module is not defined`，新产物通过——把"改没改对"压缩到 1 秒内。

---

## 8. 安装与启用（运行中的 dsh web / profile）

```bash
# 1) 构建
npm install && npm run build

# 2) 装进 profile（二选一）
#   A. file: 依赖（pnpm，拷贝语义）——profile package.json 里加：
#      "dependencies": { "@deepseek-ai/dsh-client-ui-my-plugin": "file:/path/to/plugin" }
#      然后 pnpm install（在 profile 目录）
#   B. 直接 symlink：
#      mkdir -p ~/.dsh/profiles/<profile>/node_modules/@deepseek-ai
#      ln -sfn /path/to/plugin ~/.dsh/profiles/<profile>/node_modules/@deepseek-ai/dsh-client-ui-my-plugin

# 3) 挂进启动图：~/.dsh/profiles/<profile>/cordis.patch.yml 追加：
#    - insert:
#        - id: my-plugin
#          name: '@deepseek-ai/dsh-client-ui-my-plugin'

# 4) 重启 dsh web（launcher 停止再启动，或 kill 后重跑）
```

- **`file:` 依赖是拷贝，不是链接**：改了源码必须 `npm run build` 后把 `lib/` 同步到 profile 的拷贝（或重跑 pnpm install）。校验是否同步：

  ```bash
  src=/path/to/plugin/lib; dst=~/.dsh/profiles/<p>/node_modules/@deepseek-ai/dsh-client-ui-my-plugin/lib
  for f in client.js client.js.map index.js; do
    [ "$(sha256sum $src/$f | cut -d' ' -f1)" = "$(sha256sum $dst/$f | cut -d' ' -f1)" ] \
      && echo "$f: 一致" || echo "$f: 不一致（需要同步）"
  done
  ```

- **缓存**：bundle URL 带 `?rev=<内容hash>`，bundle 一变 rev 就变、浏览器自动失效；万一首屏还是旧错误状态，硬刷新一次即可，无需清站点数据。
- **HMR**：dev 环境（仓库内开发图）webserver stat-poll bundle 并广播 `rebuilt` SSE，`client-hmr` 插件逐 fiber 热换；profile 生产方式重启最省事。
- **改动生效链路**：改源码 → build → 同步 profile → 重启 web（或等 HMR）。

---

## 9. 容易犯的问题（踩坑清单，按严重度排序）

| # | 坑 | 症状 | 修法 |
|---|---|---|---|
| 1 | **bundle 缺 CJS `module`/`exports` 声明**（esbuild 没 intro） | 启动页 "Failed to load plugins"；console：`failed to import loader entry …: module is not defined` | §6：banner 里 factory 体内声明 `var module = { exports: {} }; var exports = module.exports;` |
| 2 | **跨插件 value import**（把 `@deepseek-ai/dsh-*` 的代码卷进自己 bundle） | 仓库内：构建期被 purity gate 拒；独立插件：运行期 `require("…") missed the module table` / 双份 React 实例 | 只允许 `import type`；运行时协作走 cordis 服务 |
| 3 | **external 表与平台模块表漂移**（多 extern 或少 extern） | 少 extern：bundle 里内联了平台代码；多 extern：require 解答不了 module table | 以 `packages/client/web/src/platform.ts` 为准，外加 `@deepseek-ai/dsh-client-runtime/client` 例外 |
| 4 | **类型版本 ≠ 运行版本**（deps 写 rc.6，机器上跑 rc.5） | 编译期不报，浏览器里字段 undefined / 行为错位 | `dsh` 安装版本与 devDependencies 严格一致 |
| 5 | **`dsh.client` 声明缺失 / platform 写错** | 包被当普通包，浏览器端没有任何表现，也没有报错 | 对照 §4 JSON 逐字段 |
| 6 | **`exports["./client"]` 缺失** | host 组合期：`client bundle not found`（并提示先 build） | package.json exports 加上 `./client` |
| 7 | **client `inject` 服务名写错**（如 `conversationView` 少了 s） | box 停在 boot 页；audit 报 `pending (waiting for service: …)` | 服务名以官方源码 `inject` 数组为准：`slots` `conversationEvents` `conversationViews` `sessions` `locale` |
| 8 | **`file:` 依赖拷贝不同步** | 改了代码重启没效果；或 profile 里是旧 bundle 继续报错 | §8 的 sha256 一致性校验 |
| 9 | **忘了 node half / node half 没 `apply`** | host loader import 失败：`failed to import loader entry`（import 阶段，非物化阶段） | `src/index.ts` 保留 `export function apply(): void {}` |
| 10 | **`label` 传字符串不传函数** | Tab 文案不跟随语言切换 | `label: () => t('view.xxx')` |
| 11 | 产物里 `"use strict"` 不再是指令序言（module 声明在它前面） | 无；sloppy 模式同样执行 | 可忽略，官方 intro 同样插在代码前 |
| 12 | `lib/` 没进 `.gitignore` | 提交了过时产物，别人拉到旧 bug | `.gitignore` 加 `lib/` |

---

## 10. 排障速查表

| 现象（浏览器 console / boot 页） | 阶段 | 指向 |
|---|---|---|
| `Failed to load plugins` + `failed to import loader entry <id> (<pkg>): module is not defined` | 物化 | **坑 #1**：bundle 形态不对 |
| `failed to import loader entry …`（非 module/require 类错误） | import/apply | node half 缺失（#9）或 apply 里抛错（定位到具体行） |
| `require("…") missed the module table` | 物化 | external 漂移（#3）或跨插件 value import（#2） |
| `…: pending (waiting for service: …)` | 激活 | inject 服务名错误（#7） |
| `client bundle not found; run pnpm run build before launch` | host 组合 | 没构建或 exports["./client"] 缺失（#6） |
| 页面正常但 Tab 不出现 | 运行期 | slot id 冲突、order 没生效、locale/`slot register` 抛错——看 apply 阶段 console |
| 改了代码重启没变化 | 部署 | file: 拷贝未同步（#8）或浏览器缓存（§8） |

---

## 附录 A：官方 tsdown 三件套对照（`packages/client/tsdown.client.ts` 关键行）

```ts
outputOptions: {
  entryFileNames: 'client.js',
  banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
  footer: 'return module.exports; } });',
  intro: 'var module = { exports: {} }; var exports = module.exports;',
  //       ^ esbuild 没有 intro —— 独立插件把它并进 banner 开头（§6）
},
external: [...CLIENT_EXTERNALS],   // PLATFORM_MODULES + '@deepseek-ai/dsh-client-runtime/client'
```

## 附录 B：参考文档链

- host 侧插件基础：`dsh-plugin-dev-guide.zh.md`（本工作区）
- 官方 cookbook：`docs/cookbook/adding-a-package.md`、`docs/cookbook/adding-a-conversation-node.md`、`docs/cookbook/extension-cookbook.md`
- 子系统：`docs/subsystems/client-modules.md`、`docs/development.md`
- 官方笔记（含问题复盘，都值得读）：`.agents/notes/implemented/architecture/2026-07-23-client-plugin-loading-model.md`、`.agents/notes/archived/bug-fix/2026-07-23-demo-web-builds-client-bundles.md`