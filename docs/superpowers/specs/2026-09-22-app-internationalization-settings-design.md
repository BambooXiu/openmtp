# OpenMTP 国际化底座与设置窗口中文化设计

## 背景

OpenMTP 当前没有国际化框架，设置窗口中的可见文案直接写在 React 组件中。首期需求是在设置窗口新增语言切换，并支持英文与简体中文即时切换；后续会逐步扩展到整个应用，因此本期不能采用只适用于单个组件的条件判断或临时字典。

## 目标

- 建立可扩展到全 App 的国际化基础设施。
- 首期支持 `en` 和 `zh-CN` 两种语言。
- 在设置窗口中提供语言选择，切换后立即更新当前窗口文案。
- 将语言选择持久化，应用下次启动时继续使用上次选择。
- 完整翻译设置窗口的标题、页签、选项、说明、状态和按钮。
- 为后续按页面迁移主界面、弹窗、引导页和 Electron 主进程文案提供稳定边界。

## 非目标

- 本期不翻译设置窗口以外的界面。
- 本期不修改 Electron 菜单、系统通知、错误消息或更新窗口。
- 本期不增加繁体中文、日语等其他语言。
- 本期不重构现有 class 组件为函数组件。
- `OpenMTP`、`MTP`、`Kalam`、`Legacy` 等产品名和技术名词保持原文。

## 方案选择

采用 `i18next` 与 `react-i18next`，不使用组件内三元表达式或自建翻译状态系统。

选择该方案的原因：

- 支持运行时切换、英文回退、参数插值、复数规则和命名空间。
- React 组件可以订阅语言变化并自动重新渲染。
- 既兼容当前 React 17 和 class 组件，也能支持后续逐页迁移。
- 翻译资源可以按功能拆分，不会演变为单个巨大字典。

### 依赖版本

首期固定使用以下精确版本，不使用范围版本：

```text
i18next 23.16.8
react-i18next 13.5.0
```

`react-i18next 13.5.0` 的官方包元数据要求 React `>=16.8.0`、i18next `>=23.2.3`，与项目当前的 React 17 和上述 i18next 版本兼容。实施第一步先执行精确版本安装并检查 Yarn 输出；如出现 peer dependency 冲突，暂停实施并重新评估版本，不临场改用未经记录的版本。

## 目录与模块边界

首期目录结构如下：

```text
app/i18n/
├── index.js
├── language.js
└── locales/
    ├── en/
    │   └── settings.json
    └── zh-CN/
        └── settings.json
```

- `index.js`：创建并初始化 renderer 进程使用的 i18next 实例，注册资源、默认语言和回退语言。
- `language.js`：集中定义受支持语言、默认语言以及语言值校验，避免组件自行判断合法值。
- `settings.json`：只保存设置窗口所属命名空间的文案。

后续扩展全 App 时，在各语言目录增加 `common.json`、`home.json`、`dialogs.json`、`onboarding.json` 等命名空间，不改变本期接口。

## 翻译键约定

使用语义键，不使用英文原文作为键。例如：

```text
settings:title
settings:tabs.general
settings:general.language.label
settings:general.theme.options.dark
settings:fileManager.showHiddenFiles
settings:common.enabled
settings:common.disabled
settings:common.close
```

两种语言文件保持相同键集合。`Enabled`、`Disabled`、`Close` 等设置窗口内复用或通用的状态与操作文案，首期收敛到 `settings:common.*`；这里的 `common` 是 `settings` 命名空间内的分组，不额外创建 `common` 命名空间。跨功能共享文案在后续产生真实复用时再迁移到独立的 `common` 命名空间。

## 语言状态与持久化

在 `app/containers/Settings/reducers.js` 的 `initialState` 中明确增加 `appLanguage`。这是持久化默认值，也是 `setCommonSettings` 合法键守卫的依据：

- 默认值为 `en`，保持现有用户体验不变。
- 允许值由 `language.js` 统一定义，目前为 `en`、`zh-CN`。
- 继续复用现有 `setCommonSettings` 和设置文件写入流程，将值保存到 `settings.json`。
- 读取旧版设置文件时，如果没有 `appLanguage`，使用默认英文。
- 如果持久化值为空或不受支持，归一化为英文，避免 i18next 和 Redux 状态分歧。
- 语言选择复用 `setCommonSettings`，因此在启用匿名统计时会沿用现有行为，上报 `TOOLBAR_SETTINGS_CHANGE` 事件及 `appLanguage=en|zh-CN`；本期接受这一行为，不新增独立埋点。

归一化不放进通用的 `Settings` reducer。`COPY_JSON_FILE_TO_SETTINGS` 继续保持通用 spread 行为，避免语言功能改变其他设置的恢复语义。语言值只在两个边界归一化：

1. `app/index.js` 启动 bootstrap 从设置文件读取语言时。
2. i18n 初始化或切换语言之前。

bootstrap 必须使用现有的纯 action `copyJsonFileToSettings`，只把归一化后的语言合并进 Redux：

```js
const storedSettings = settingsStorage.getItems(['appLanguage']);
const appLanguage = normalizeAppLanguage(storedSettings.appLanguage);

store.dispatch(copyJsonFileToSettings({ appLanguage }));
initializeI18n(appLanguage);
```

bootstrap 禁止调用 `setCommonSettings`。后者用于用户主动修改设置，会写回整个 `settings.json` 并触发 `TOOLBAR_SETTINGS_CHANGE` analytics；启动恢复必须保持为无持久化、无埋点的纯 hydration。`setCommonSettings` 只在用户操作语言选择控件时使用。

顶层应用组件根据 Redux 中的 `appLanguage` 同步调用 `i18n.changeLanguage()`；这样当前设置窗口会立即更新，后续接入国际化的其他已挂载组件也会同步更新。

## 设置窗口交互

在“General / 常规”页顶部、主题设置之前增加语言选择控件：

- 控件标签随当前语言显示为 `Language` 或 `语言`。
- 选项固定显示为 `English` 和 `简体中文`，便于用户在不熟悉当前界面语言时识别。
- 选择后立即更新 Redux、i18next 和持久化设置，不需要关闭窗口或重启应用。
- 使用下拉选择控件，便于后续增加更多语言，而不让设置页随语言数量增长。

设置窗口 class 组件通过 `withTranslation('settings')` 接入翻译，不为本功能改写组件类型。所有用户可见文案通过 `t()` 获取；设备名和动态方向文案使用插值组合，不拼接中英文句子。

## 数据流

```text
用户选择语言
  -> Settings 的现有 common setting action
  -> Redux 更新 appLanguage
  -> 写入 settings.json
  -> 顶层语言同步逻辑调用 i18n.changeLanguage()
  -> react-i18next 通知设置窗口重新渲染
  -> 当前窗口立即显示目标语言
```

应用再次启动时：

```text
app/index.js 在 render() 前读取 settings.json 中的 appLanguage
  -> language.js 归一化，非法值回退 en
  -> store.dispatch(copyJsonFileToSettings({ appLanguage }))
  -> 使用同一值初始化 i18next
  -> render(<Root />)
  -> App.componentWillMount 执行既有 freshInstall 流程
  -> 设置窗口使用该语言渲染
```

该顺序专门规避现有首次安装状态机的数据丢失窗口：第二次启动时，`freshInstall()` 会将当前 Redux `Settings` 全量写回 `settings.json`。bootstrap 必须先把持久化语言注入 Redux，确保这次覆写仍包含用户在首次启动时选择的 `zh-CN`，而不是默认 `en`。本期只为语言设置补齐这条启动恢复链路，不顺带重构其他设置的既有首次安装行为。

## 异常与回退策略

- 缺少中文键时由 i18next 回退到英文。
- 不受支持的语言值回退为 `en`。
- 英文资源是基准资源；本地国际化测试脚本递归展开两份 JSON 并检查键集合一致，防止遗漏翻译进入提交。
- 语言切换不依赖网络，全部资源随应用打包。
- 持久化失败沿用现有设置写入错误处理，本期不引入另一套存储机制。

## 测试与验证

先写测试并确认测试因功能缺失而失败，再编写生产代码。测试重点包括：

1. 默认语言是英文。
2. `zh-CN` 能返回对应的设置窗口中文文案。
3. 中文缺失键会回退到英文。
4. 不受支持的持久化语言会归一化为英文。
5. 英文和中文资源的键集合完全一致。
6. `Settings` reducer 能保存 `appLanguage`，旧设置缺少该字段时仍得到英文默认值。
7. 启动 bootstrap 在 React render 前读取、归一化并注入已保存语言。
8. 模拟第二次启动的 `freshInstall()` 全量写回后，`zh-CN` 不会被默认英文覆盖。
9. bootstrap dispatch 的是 `COPY_JSON_FILE_TO_SETTINGS` 纯 action，不会调用设置持久化或 analytics。

项目当前没有测试脚本。首期使用现有 Babel 运行能力和 Node `assert`，新增 `internals/scripts/test-i18n.js`，并通过 package script `test:i18n` 执行；键集合一致性检查也由该脚本承载，避免仅为这一功能引入完整测试框架。交付前还要执行：

- 国际化专项测试。
- ESLint。
- renderer 与 main 的生产构建。
- 手动冒烟检查：英文切换中文、中文切回英文、关闭并重新打开同一个 Settings Dialog、重启后恢复语言。

## 后续全 App 迁移方式

后续按功能逐步迁移，不进行一次性大规模替换：

1. 为目标功能新增命名空间和两种语言资源。
2. 将该功能的可见文案替换为 `t()` 调用。
3. 补齐键集合和关键插值测试。
4. 完成页面级验证后再迁移下一功能。

Renderer 进程继续复用本期 i18next 实例。Electron 主进程中的菜单和系统通知在后续阶段创建独立实例，并读取同一语言设置与资源，避免主进程依赖 React。

## 验收标准

- 设置窗口可以选择 `English` 和 `简体中文`。
- 语言切换后设置窗口立即完整切换文案，不需要重新打开。
- 重启应用后保留上次选择。
- 设置窗口不存在散落的中英文条件判断。
- 中文资源缺失时不会显示空白或翻译键。
- 旧设置文件无需迁移即可正常使用。
- 国际化专项测试、Lint 和生产构建通过。
