# LumenGuide 使用与维护指南

> 基于 WinUIonWeb 设计的 Vue 3 内容平台。本文档合并「常用控件教程」与「网站维护指南」，**所有控件 API 均按当前代码（`src/components/Win*.vue`）逐文件核对**。
> 最后更新：2026-07-13（MD 驱动篇章架构 + 浮层不透明实色材质 + 自托管图标字体）。

---

# 第一部分：常用控件教程

本库控件均为 Vue 3 单文件组件，开箱即用、自动跟随系统明暗主题，适合快速搭建类 Windows 风格界面。

## 1. 如何使用这些控件

控件都在 `src/components/` 目录下，文件名即组件名（`WinButton.vue` → `<WinButton>`）。在任意页面的 `<script setup>` 里按名称 import 即可：

```vue
<script setup lang="ts">
import WinButton from '../components/WinButton.vue';
import WinTextBox from '../components/WinTextBox.vue';
</script>

<template>
  <WinButton primary>保存</WinButton>
  <WinTextBox v-model:Text="name" Header="姓名" />
</template>
```

### 两种 v-model 约定（重要）

| 风格 | 组件举例 | 双向绑定写法 |
| --- | --- | --- |
| PascalCase 具名属性 | `WinTextBox`、`WinPasswordBox`、`WinNumberBox`、`WinSearchBox` | `v-model:Text` / `v-model:Value` / `v-model:Password` / `v-model:text` |
| 直接 `modelValue` | 其余大部分（`WinButton`、`WinToggleSwitch`、`WinSlider`、`WinComboBox`、`WinRadioButton`、`WinCommandBar`、`WinFlyout`、`WinInfoBar`、`WinDatePicker`、`WinTimePicker`、`WinCalendarDatePicker` 等） | 直接用 `v-model` |

> 简单记：**带 `Box` / `Picker` 的文本/数值控件用 `v-model:属性名`；其余大多直接用 `v-model`**。

---

## 2. 按钮类

### WinButton

```vue
<WinButton primary @click="save">保存</WinButton>
<WinButton subtle>关闭</WinButton>
<WinButton :disabled="busy">提交</WinButton>
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `primary` | Boolean | `false` | 主按钮（强调色填充） |
| `subtle` | Boolean | `false` | 无背景的轻量按钮 |
| `disabled` | Boolean | `false` | 禁用 |
| `wrap` | Boolean | `false` | 允许文本换行 |

默认插槽放按钮内容；点击事件就是原生 `@click`。

### WinToggleButton / WinHyperlinkButton

- `WinToggleButton`：可保持按下状态的按钮，用 `v-model` 绑定布尔值。
- `WinHyperlinkButton`：外观为链接的按钮。

```vue
<WinHyperlinkButton navigate-uri="https://example.com" open-in-new-window>访问官网 →</WinHyperlinkButton>
<WinHyperlinkButton @click="openDoc">查看文档</WinHyperlinkButton>
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `navigateUri` | String | `''` | 有此值则渲染为 `<a>` 链接，否则渲染为按钮 |
| `openInNewWindow` | Boolean | `false` | 链接是否在新窗口打开 |

---

## 3. 文本输入

### WinTextBox（单行 / 多行）

```vue
<WinTextBox v-model:Text="name" Header="姓名" PlaceholderText="请输入姓名" />
<WinTextBox v-model:Text="bio" Header="简介" AcceptsReturn TextWrapping="Wrap" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `Text` | String | `''` | 内容（`v-model:Text`） |
| `Header` | String | `''` | 顶部标题 |
| `Description` | String | `''` | 底部说明 |
| `PlaceholderText` | String | `''` | 占位提示 |
| `AcceptsReturn` | Boolean | `false` | `true` 变多行 textarea |
| `IsReadOnly` | Boolean | `false` | 只读 |
| `IsEnabled` | Boolean | `true` | 是否可用 |
| `MaxLength` | Number | `0` | 最大长度（0=不限） |
| `TextWrapping` | `'NoWrap'\|'Wrap'\|'WrapWholeWords'` | `'NoWrap'` | 换行方式 |
| `TextAlignment` | `'Left'\|'Center'\|'Right'\|'Justify'` | `'Left'` | 对齐 |

事件：`update:Text`、`TextChanged`、`GotFocus`、`LostFocus`、`Paste`、`SelectionChanged` 等。

### WinPasswordBox（密码框）

```vue
<WinPasswordBox v-model:Password="pwd" Header="密码" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `Password` | String | `''` | 密码值（`v-model:Password`） |
| `PasswordChar` | String | `'●'` | 掩码字符 |
| `PasswordRevealMode` | `'Peek'\|'Hidden'\|'Visible'` | `'Peek'` | 显示密码的方式 |
| `MaxLength` | Number | `0` | 最大长度 |

### WinNumberBox（数字输入框）

```vue
<WinNumberBox v-model:Value="age" :Minimum="0" :Maximum="120"
  SpinButtonPlacementMode="Inline" Header="年龄" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `Value` | Number | `NaN` | 数值（`v-model:Value`） |
| `Minimum` / `Maximum` | Number | `±Infinity` | 取值范围 |
| `SmallChange` / `LargeChange` | Number | `1` / `10` | 增减步长 |
| `SpinButtonPlacementMode` | `'Hidden'\|'Compact'\|'Inline'` | `'Hidden'` | 增减按钮摆放 |
| `AcceptsExpression` | Boolean | `false` | 允许输入 `2+3` 这类表达式 |

事件：`update:Value`、`ValueChanged`。

### WinSearchBox（搜索框）

```vue
<WinSearchBox v-model:text="q" placeholder-text="搜索页面" @querySubmitted="onSearch" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `text` | String | `''` | 搜索词（`v-model:text`） |
| `placeholderText` | String | `'搜索...'` | 占位提示 |
| `maxSuggestionHeight` | Number | `0` | 建议列表最大高度（0=不限） |
| `navMode` | `'left'\|'top'` | `'left'` | 搜索框位于左导航还是顶部导航 |

事件：`update:text`、`querySubmitted`（`{ queryText, chosenSuggestion }`）、`suggestionChosen`。

---

## 4. 选择与开关

### WinToggleSwitch（开关）

```vue
<WinToggleSwitch v-model="dark" />
<WinToggleSwitch v-model="notify" onContent="开" offContent="关" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | Boolean | `false` | 状态（`v-model`） |
| `onContent` / `offContent` | String | `'On'` / `'Off'` | 开 / 关时文字 |
| `disabled` | Boolean | `false` | 禁用 |

### WinCheckBox（复选框，支持三态）

```vue
<WinCheckBox v-model="agree">我同意用户协议</WinCheckBox>
<WinCheckBox v-model="part" :isThreeState="true">部分完成</WinCheckBox>
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | Boolean \| `null` | `false` | `v-model`（三态可为 `null`） |
| `isThreeState` | Boolean | `false` | 启用三态 |
| `indeterminate` | Boolean | `false` | 外部控制的中间态 |

事件：`update:modelValue`、`checked`、`unchecked`、`indeterminate`。

### WinRadioButton / WinRadioButtons（单选）

```vue
<WinRadioButton v-model="choice" :value="'a'">选项 A</WinRadioButton>
<WinRadioButton v-model="choice" :value="'b'">选项 B</WinRadioButton>

<!-- 或一组数据 -->
<WinRadioButtons :ItemsSource="['小','中','大']" v-model:SelectedIndex="i" Header="尺寸" />
```

`WinRadioButton`：prop `modelValue`(String|Number) + `value`；`WinRadioButtons`：prop `ItemsSource`(Array) + `SelectedIndex`/`SelectedItem`，事件 `SelectionChanged`。

### WinComboBox（下拉选择）

```vue
<WinComboBox :options="[{ label: '红' }, { label: '绿' }, { label: '蓝' }]" v-model="sel" />
```

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `options` | Array | 选项数组，每项需有 `label` 字段 |
| `modelValue` | Number | 选中项**索引**（`v-model`） |
| `disabled` | Boolean | 禁用 |

事件：`update:modelValue`（返回选中索引）。

### WinSlider（滑块）

```vue
<WinSlider v-model="vol" :min="0" :max="100" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | Number | — | 当前值（`v-model`） |
| `min` / `max` | Number | `0` / `100` | 范围 |

### WinColorPicker（颜色选择）

```vue
<WinColorPicker v-model="c" />
```

`modelValue` 为颜色字符串（`v-model`）。

---

## 5. 日期与时间选择

### WinDatePicker（日期）

```vue
<WinDatePicker v-model="birthday" header="出生日期" :year-visible="true" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | Date | `new Date()` | 日期（`v-model`） |
| `header` | String | `''` | 顶部标题 |
| `yearVisible` | Boolean | `true` | 是否显示年份列 |
| `dayFormatted` | Boolean | `false` | 日期补零（01, 02…） |

### WinTimePicker（时间）

```vue
<WinTimePicker v-model="meeting" clock-identifier="24HourClock" :minute-increment="5" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | Date | `new Date()` | 时间（`v-model`，仅取时分） |
| `clockIdentifier` | `'12HourClock'\|'24HourClock'` | `'12HourClock'` | 12/24 小时制 |
| `minuteIncrement` | Number | `1` | 分钟步进 |

### WinCalendarDatePicker / WinCalendarView

- `WinCalendarDatePicker`：`modelValue: Date`，带弹层，适合表单里选单个日期。
- `WinCalendarView`：`modelValue: Date|Array`，`selectionMode: 'Single'|'Multiple'`，日/月/年三态滚动，适合完整日历视图。

---

## 6. 进度指示

### WinProgressBar（进度条）

```vue
<WinProgressBar :value="70" :maximum="100" />
<WinProgressBar isIndeterminate />          <!-- 循环动画 -->
<WinProgressBar :value="40" showError />     <!-- 错误态 -->
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `value` | Number | `0` | 当前进度 |
| `maximum` | Number | `100` | 最大值 |
| `isIndeterminate` | Boolean | `false` | 循环动画（忽略 value） |
| `showError` | Boolean | `false` | 红色错误态 |
| `showPaused` | Boolean | `false` | 黄色暂停态 |

### WinProgressRing（环形进度）

```vue
<WinProgressRing />              <!-- 不确定循环，自动跟随主题色 -->
<WinProgressRing color="#0078D4" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `color` | String | `null` | 圆环颜色；`null` 时跟随主题强调色 |

---

## 7. 页面容器与导航

### WinPage（页面容器）

```vue
<WinPage title="标题" description="副标题" pageKey="mypage">
  <p>正文内容</p>
</WinPage>
```

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `title` | String | 页面顶部大标题 |
| `description` | String | 标题下方灰色副标题 |
| `pageKey` | String | **唯一 key**，用于收藏与「最近访问」；不传则不显示收藏按钮 |
| `noHeader` | Boolean | 隐藏头部 |

插槽：默认（页面内容）。

### WinPageHeader（头部操作区）

`WinPage` 内部使用，提供主题切换 / 收藏按钮。prop：`isFavorite`、`currentTheme`；事件：`theme-toggle`、`favorite-toggle`。

### WinNavigationView（导航视图）

支持左 / 顶部 / 极简 / 自动多种模式，含动画指示条。常用 prop：

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `position` | String | `'Left'` | 导航位置（`Left`/`Top`/`LeftCompact`/`Auto`） |
| `menuItems` | Array | `[]` | 菜单项，形如 `{ value, label, icon, children? }` |
| `footerItems` | Array | `[]` | 底部署件（如设置） |
| `selectedValue` | String | — | 当前选中项（`v-model:selectedValue`） |
| `isSettingsVisible` | Boolean | `true` | 是否显示设置入口 |
| `compactModeThresholdWidth` | Number | `640` | 小屏断点（< 此宽度强制极简模式并锁定） |

事件：`update:selectedValue`、`back`。插槽：`topSearch`、`paneHeader`、`paneFooter`、`contentHeader`、`header`。

> **小屏行为（重要）**：屏宽 `< 640px` 时导航**强制进入「简约」(LeftMinimal) 并锁定切换**，这是设计既定行为，不要试图在小屏下强制显示其它模式。

---

## 8. 浮层、菜单、命令栏与提示

> 所有浮层背景使用**不透明实色**（跟随主题），无需额外配置；这是项目统一材质规范。

### WinFlyout（浮层）

```vue
<WinFlyout>
  <template #trigger><WinButton>更多</WinButton></template>
  <div class="flyout-body"><p>浮层内容</p></div>
</WinFlyout>
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `placement` | `'top'\|'bottom'\|'left'\|'right'` | `'bottom'` | 弹出方向 |
| `direction` | `'down'\|'up'\|'auto'` | `'auto'` | 兼容旧写的弹出方向 |
| `align` | `'left'\|'center'\|'right'` | `'left'` | 水平对齐 |

插槽：`#trigger`（锚点）、默认（内容）。暴露：`show()`、`hide()`、`toggle()`、`visible`。

### WinPopup（弹出）

`visible: Boolean`、`lightDismiss: Boolean`（默认 `true`）、`horizontalOffset` / `verticalOffset`。插槽：`#trigger`、默认。

### WinMenuFlyout（菜单浮层）

```vue
<WinMenuFlyout :open="open" :anchor-rect="rect" :items="items" @select="onSelect" />
```

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `open` | Boolean | 是否打开 |
| `anchorRect` | Object | 定位矩形（DOMRect 或 `{x,y,...}`） |
| `items` | Array | 菜单项，形如 `{ label, icon? }` 或字符串；`kind: 'separator'` 为分隔线 |
| `alignment` | `'center'\|'right'` | 对齐 |

事件：`close`、`select`（`(item, index)`）。被 `WinTextBox`、`WinComboBox` 等多个控件复用。

### WinContextMenu（右键菜单）

```vue
<WinContextMenu :open="open" :anchor="{ clientX, clientY }" :items="items" @select="onSelect" />
```

`items` 项：`{ label, icon?, shortcut?, disabled?, kind? }`。事件：`close`、`select`。

> 全局右键菜单由 `WinContextMenu.vue` + `useContextMenu.ts` 统一处理（捕获阶段拦截），优先级高于组件内菜单。

### WinCommandBar（命令栏）

```vue
<WinCommandBar
  :primaryCommands="[{ component: WinAppBarButton, props: { label: '保存', icon: '\uE74E' } }]"
  :secondaryCommands="[{ component: WinAppBarButton, props: { label: '设置' } }]" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `primaryCommands` | Array | `[]` | 主命令（`{ component, props, key? }`） |
| `secondaryCommands` | Array | `[]` | 溢出菜单里的次级命令 |
| `defaultLabelPosition` | `'Bottom'\|'Right'\|'Collapsed'` | `'Bottom'` | 标签位置 |
| `isSticky` | Boolean | `false` | 展开后点击不自动收起 |
| `isDynamicOverflowEnabled` | Boolean | `true` | 空间不足时主命令自动移入溢出 |

暴露：`open()`、`close()`、`toggle()`；事件：`opening`/`opened`/`closing`/`closed`。

### WinCommandBarFlyout（命令栏浮层）

`Open`、`AnchorRect`、`PrimaryCommands`、`SecondaryCommands`、`Placement`、`ShowMode`、`MinWidth`、`ShowPrimaryLabels`、`Theme`。命令项形如 `{ Label, Icon?, Name?, Command?, IsEnabled?, IsToggle?, IsChecked? }`。事件：`Command`、`Close`。

### WinInfoBar（信息条）

```vue
<WinInfoBar v-model:isOpen="showTip" severity="Warning" title="注意" message="磁盘空间不足。" />
```

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `isOpen` | Boolean | `false` | 是否显示（`v-model:isOpen`） |
| `title` / `message` | String | `''` | 标题 / 正文 |
| `severity` | `'Informational'\|'Success'\|'Warning'\|'Error'` | `'Informational'` | 严重级别（决定配色与图标） |
| `isClosable` | Boolean | `true` | 显示关闭按钮 |

插槽：`default`、`actionButton`。

### WinTeachingTip（教学提示）

`visible`、`title`、`subtitle`、`isTargeted`、`hasHero`、`showCloseButton`。事件：`close`。插槽：`hero`、`icon`、`default`、`actions`。

### WinContentDialog（内容对话框）

```vue
<WinContentDialog v-model:visible="showDlg" title="删除？" primary-text="删除" secondary-text="取消"
  @primary="doDelete">
  <p>确定要删除该项吗？</p>
</WinContentDialog>
```

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `visible` | Boolean | 是否显示（`v-model:visible`） |
| `title` | String | 标题 |
| `primaryText` / `secondaryText` / `closeText` | String | 按钮文字 |
| `defaultButton` | String | 默认焦点按钮 |

事件：`primary`、`secondary`、`close`。

---

## 9. 其他常用组件

| 组件 | 一句话用途 | 关键 prop |
| --- | --- | --- |
| `WinExpander` | 可折叠面板 | `isExpanded`、`header`、`expandDirection` |
| `WinScrollViewer` | 滚动视图（自定义滚动条 + 缩放） | `ZoomMode`、`ZoomFactor`、`HorizontalScrollBarVisibility`、`VerticalScrollBarVisibility`；暴露 `zoomToFactor`/`changeView`/`ScrollTo` |
| `WinListView` | 列表视图（分组/选择/拖拽重排） | `items`、`isGrouped`、`selectionMode`、`selectedItems`；插槽 `#item`(`{item}`)、`#header`(`{group}`) |
| `WinInfoBadge` | 信息徽标（点/数字/图标） | `value`(-1 显示圆点)、`iconSource`、`styleVariant`(`attention`/`informational`/`success`/`critical`) |
| `WinSplitButton` | 拆分按钮（主操作 + 下拉） | `options`；事件 `click`/`select` |
| `WinDropDownButton` | 下拉按钮 | `items`；事件 `select` |
| `WinImage` | 图片 | `src`(必填)、`alt`、`width`、`height`、`stretch`(`Uniform`)、`radius` |
| `WinPersonPicture` | 头像（图片/首字母/占位） | `profilePicture`、`displayName`、`initials`、`size` |
| `WinSettingsCard` | 设置卡片容器 | `title`、`description`、`header`(插槽) |
| `WinBreadcrumbBar` | 面包屑 | `items` |
| `WinGridView` / `WinTreeView` / `WinFlipView` / `WinSemanticZoom` / `WinMenuBar` / `WinSplitView` / `WinRichEditBox` / `WinColorPicker` | 等更多组件 | 见 `src/components/` 对应文件 |

> 控件源码均位于 `src/components/`，需要更细参数或事件，直接打开对应 `WinXxx.vue` 查看 `<script setup>` 里的 `defineProps` / `defineEmits`。

---

## 10. 完整小例子（设置面板风格）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import WinButton from '../components/WinButton.vue';
import WinTextBox from '../components/WinTextBox.vue';
import WinToggleSwitch from '../components/WinToggleSwitch.vue';
import WinComboBox from '../components/WinComboBox.vue';
import WinSlider from '../components/WinSlider.vue';
import WinInfoBar from '../components/WinInfoBar.vue';

const nickname = ref('');
const dark = ref(false);
const theme = ref(0);
const fontSize = ref(14);
const saved = ref(false);

const themes = [{ label: '浅色' }, { label: '深色' }, { label: '跟随系统' }];

function save() {
  saved.value = true;
  setTimeout(() => (saved.value = false), 2500);
}
</script>

<template>
  <div class="panel">
    <WinInfoBar v-model:isOpen="saved" severity="Success" title="已保存" message="你的设置已更新。" />
    <WinTextBox v-model:Text="nickname" Header="昵称" PlaceholderText="请输入昵称" />
    <WinToggleSwitch v-model="dark">深色模式</WinToggleSwitch>
    <div class="row"><span>主题</span><WinComboBox :options="themes" v-model="theme" /></div>
    <div class="row"><span>字号 {{ fontSize }}px</span><WinSlider v-model="fontSize" :min="12" :max="20" /></div>
    <WinButton primary @click="save">保存设置</WinButton>
  </div>
</template>
```

---

## 11. 常见坑与小贴士

1. **v-model 写法别搞混**：带 `Box` / `Picker` 的文本数值控件用 `v-model:Text` / `v-model:Value` / `v-model:Password` / `v-model:text`；其余直接用 `v-model`。
2. **WinComboBox 绑定的是索引**：`v-model` 拿到的是选中项在 `options` 里的下标（Number），不是选项对象本身。
3. **日期 / 时间控件返回 `Date` 对象**：存库或比较前用 `.toISOString()` 或自行格式化。
4. **图标要用转义写法**：JS / 模板字符串里写 `''`（反斜杠 u + 四位十六进制），**不要**粘裸 PUA 字形、`{{ }}` 里也**不要**用 `&#x...;` HTML 实体（会变成字面文本）。`.md` frontmatter 可用裸 `uXXXX`（构建脚本自动解码）。
5. **浮层自动跟随主题**：所有浮层背景为不透明实色，切深 / 浅色自动变化，无需手动处理。
6. **进度条循环动画**：不确定进度用 `isIndeterminate`，此时 `value` 被忽略。
7. **小屏导航锁定**：`< 640px` 时导航强制「简约」模式且不可切换，属设计行为。

---

# 第二部分：网站维护指南

## 一、项目结构速览（当前版本）

```
LumenGuide/
├── src/
│   ├── App.vue                 # 应用入口：页面注册(pageMap)、导航菜单、全局主题/设置
│   ├── content/                # ★ 篇章文章（MD 驱动）：ch1-s1.md … ch{n}-{m}.md
│   ├── data/
│   │   └── pages.ts            # 站点通用页（首页/设置/序言）+ 搜索/导航；导出 chapter*
│   ├── pages/
│   │   ├── chapters.ts         # 章派生逻辑（从 markdownArticles 生成章列表/分组）
│   │   ├── ArticlePage.vue     # 篇章文章渲染页（按 pageKey 加载对应 .md）
│   │   ├── HomePage.vue        # 首页（项目介绍、篇章网格、最近访问、我的收藏）
│   │   ├── PrefacePage.vue     # 序言页（含评论区）
│   │   └── SettingsPage.vue     # 设置页
│   ├── components/             # WinUI 组件库（Win*.vue，100+ 个）
│   ├── composables/            # 逻辑（useFavorites 收藏、useContextMenu 右键菜单等）
│   ├── styles/
│   │   ├── theme.css           # 主题变量（颜色、字体、背景、浮层材质）
│   │   └── animations.css      # 页面切换动画
│   └── main.ts
├── scripts/
│   ├── build-md.mjs            # 构建期把 content/*.md 预渲染为 src/data/markdownArticles.ts
│   └── dev/                    # 开发/调试脚本（build_icon_font.py 等）
├── public/                     # 静态资源
├── dist/                       # 构建产物（部署用）
├── index.html
└── vite.config.ts              # Vite 配置（base: '/LumenGuide/'）
```

维护文章时，**篇章文章只改 `src/content/*.md`**；独立页面才改 `src/pages/*.vue` + 注册。

---

## 二、篇章文章（MD 驱动）✨

当前篇章完全由 `src/content/*.md` 驱动，**不需要手写 Vue 页面**，增删章纯改 `.md`：

### 文件命名与 frontmatter

每个章节一个文件，命名 `ch{章号}-{节号}.md`（如 `ch1-s1.md`）。文件头：

```markdown
---
chapter: 1            # 第几章（数字）
section: 1            # 第几节（数字）
title: 开箱初体验      # 节标题（显示在文章/搜索里）
chapterName: 第一卷 · 开箱与初见   # 章名（显示在导航分组、首页网格）
chapterIcon: uE7B8    # 章图标（裸 uXXXX 写法，构建时解码为字形）
icon: uE80F           # 本节图标（裸 uXXXX）
summary: 第一次开机要做的事
keywords: [开箱, 新手, setup]
---

正文用普通 Markdown 写……

## 小标题

- 列表项
- 支持 **加粗**、*斜体*、[链接](https://...)
```

### 增加一章 / 一节

1. 在 `src/content/` 新建 `ch{n}-{m}.md`，填好 frontmatter + 正文。
2. **无需改任何其它文件** —— `npm run build` 时 `scripts/build-md.mjs` 会把所有 `.md` 预渲染进 `src/data/markdownArticles.ts`，导航分组、首页「篇章网格」、搜索结果**自动出现**这一章。

### 删除一章 / 一节

直接删除对应的 `ch{n}-{m}.md` 即可，其余自动消失。

### 修改内容

直接编辑 `.md` 正文；开发服务器（`npm run dev`）会热更新。

### 换章名 / 章图标

改该章**任一篇** `.md` 的 `chapterName` / `chapterIcon` 字段即可（同一章的多篇共享章名/章图标，取第一篇的值；无则回落默认）。

### 渲染与锚点

`ArticlePage.vue` 按 `pageKey`（如 `ch1-1`）加载对应 `.md` 并排版；导航点某章 → 进入文章页并锚点定位到该节。评论区按 `pageKey` 独立（见第六部分）。

> 旧版用 `Volume{n}.vue` + `chapters.ts` 里的 `chapterPlan` 写死章结构，现已**废弃删除**；若文档/记忆里还提到 `Volume*.vue` / `chapterPlan`，一律以本节的 MD 驱动为准。

---

## 三、添加独立页面（非篇章）

若某页需要完全自定义排版（不是篇章文章），建一个 `.vue`：

```vue
<template>
  <WinPage title="标题" description="副标题" pageKey="mypage">
    <div class="content"><p>页面内容</p></div>
  </WinPage>
</template>
<script setup>
import WinPage from '../components/WinPage.vue';
</script>
```

然后在三处登记（篇章文章不需要这些）：

1. `src/App.vue` 的 `pageMap` 加入 `mypage: MyPage`（并 import）。
2. `src/data/pages.ts` 的 `allPages` 数组加入元数据（key / icon / title / titleZh / desc / keywords）。
3. 如需进导航：`src/App.vue` 的 `navMenuItems` 加 `{ value: 'mypage', icon: '\uE8A5', label: '我的页面' }`。

`icon` 用转义写法 `'\uE8A5'`（Segoe/Fluent 码位）。常用：`\uE80F` 首页、`\uE8A5` 文档、`\uE946` 笔记、`\uE713` 设置、`\uE735` 收藏实心、`\uE734` 未收藏。

---

## 四、运行与构建

```powershell
cd D:\new\LumenGuide\LumenGuide

# 开发服务器（热更新）
npm run dev

# 生产构建（vue-tsc 类型检查 + vite 打包，产物在 dist/）
npm run build
```

构建检查若报类型错误，按提示修复后重试。**修改 `src/content/*.md` 后必须重新 `npm run build`** 才能更新线上（dev 模式自动）。

### 部署到 GitHub Pages

后端是 GitHub Pages（`gh-pages` 分支），对外域名 `blog.oxzh.top/LumenGuide`。更新线上两步：

```bash
npm run build
cd dist && git init && touch .nojekyll && cp index.html 404.html \
  && git add -A && git commit -m "本次更新文章基本由AI生成" \
  && git push -f git@github.com:xzhnew/LumenGuide.git HEAD:gh-pages
```

源码提交：`git commit -m "本次更新文章基本由AI生成"`（固定提交信息）。

---

## 五、设计规范速查

### 主题变量（`src/styles/theme.css`）

| 变量 | 用途 |
| --- | --- |
| `var(--text-primary)` | 主要文字 |
| `var(--text-secondary)` | 次要/说明文字 |
| `var(--text-tertiary)` | 更淡提示 |
| `var(--accent-base)` | 主题强调色（蓝，浅色 `#0067C0` / 深色 `#4CC2FF`） |
| `var(--accent-text)` | 强调色上的文字 |
| `var(--card-bg-default)` | 卡片背景 |
| `var(--card-stroke)` | 卡片边框 |
| `var(--stroke-divider)` | 分隔线 |
| `--material-solid` / `--flyout-bg` | **浮层背景（不透明实色）** |

### 图标字体（跨平台必看）

- 图标是 Segoe MDL2/Fluent 的 PUA 字符，**必须走自托管字体 `LumenGuideIcons`**（App.vue `@font-face` → `src/assets/Fonts/SEGOEICONS.TTF`，构建打进 dist）。
- `.icon` 字体栈：`'LumenGuideIcons','Segoe Fluent Icons','Segoe MDL2 Assets'`。
- **写法铁律**：JS / 模板字符串用 `'\uE...'`；`.md` frontmatter 用裸 `uXXXX`（build-md 解码）；`.md` 正文只能用 `&#x....;`。新增图标优先内联 SVG。
- 验证必须跨平台（Mac / 手机 / 屏蔽 Segoe 字体），不能只在 Windows 上看。

### 浮层材质规范（已定）

所有浮层（右键菜单、搜索弹窗、下拉、日历、通用弹窗、命令栏浮层等）背景用**不透明实色** `--material-solid` / `--flyout-bg`，**不得**用半透明亚克力。原因：`backdrop-filter` 在元素或祖先带 `transform`/`filter`/`will-change` 时会失效；且页面切换动画需保留 `transform` 作包含块，故浮层改用实色兜底。

### 响应式断点

- `≥ 1008px`：左导航展开（宽 320px）
- `640px ~ 1007px`：左导航紧凑（仅图标）
- `< 640px`：强制「简约」(LeftMinimal) 并锁定，汉堡抽屉里含设置等入口

---

## 六、评论系统（Waline）

- 前端已接入 `@waline/client` v3，文章页（`ArticlePage`）与序言页（`PrefacePage`）底部均有评论区，按 `pageKey` 独立。
- 服务端：`https://speak.oxzh.top`（自建 Vercel 后端）。
- 暗色跟随：评论区随页面主题切换（`update({ dark })`）。
- 配色：与文章统一用蓝色强调色；操作类按钮（表情/回复/赞）仅 hover 变蓝，用户名/提交/管理员图标保持蓝。

> **后端若打不开（500）**：Vercel serverless 运行时是 Rust 版 Node，**不支持 `require(ESM)`**，`@waline/vercel` 最新版依赖的 `@mdit/*` 纯 ESM 包会崩。稳定解法是后端 `package.json` 钉 **`"@waline/vercel": "1.27.0"` 并删掉 `overrides`**（纯 CJS 旧栈，无 `@mdit`）；QQ 通知（Qmsg 酱 `QMSG_KEY`/`QQ_ID`）在 1.27.0 保留。若坚持用最新版，须换 Railway/Render/VPS/Docker 等真实 Node ≥ 22.12 平台。

---

## 七、常见问题

**Q：新文章搜索不到？**
A：篇章文章检查 `src/content/*.md` 的 frontmatter 是否完整；独立页面检查 `pages.ts` 的 `allPages` 与 `App.vue` 的 `pageMap`。

**Q：收藏按钮不显示？**
A：`WinPage` 必须传 `pageKey`。

**Q：导航在小屏显示异常？**
A：`< 640px` 本就强制简约模式。若怀疑旧状态残留，F12 → Application → Local Storage 清掉 `winui-*` 相关键后刷新。

**Q：改完页面没变化？**
A：Vite 偶尔热更新失败，按 **Ctrl + F5** 硬刷新；改 `.md` 后记得重新 `npm run build`。

**Q：评论区不显示 / 打不开？**
A：见第六部分后端部署说明（钉 1.27.0）。

---

*维护愉快！*
