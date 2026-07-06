<template>
  <div class="win-asb" ref="rootRef">
    <!-- 内部组合 WinUI 3 TextBox：提供 Text / PlaceholderText / Header / Description -->
    <WinTextBox
      v-model="text"
      :placeholder-text="placeholderText"
      :header="header"
      :description="description"
      :clear-button-visible="false"
      ref="textBoxRef"
      @keydown="onKeydown"
      @text-changed="onTextBoxTextChanged">
      <!-- Header / Description 模板（对标 AutoSuggestBox.HeaderTemplate / DescriptionTemplate） -->
      <template #header><slot name="header" /></template>
      <template #description><slot name="description" /></template>
      <!-- QueryIcon：框内末端、框内的 WinButton（对标 AutoSuggestBox.QueryIcon） -->
      <template #suffix>
        <WinButton
          class="win-asb-query-btn"
          :aria-label="queryButtonAriaLabel"
          @click="submitQuery">
          <span class="icon">{{ queryIcon }}</span>
        </WinButton>
      </template>
    </WinTextBox>

    <!-- 建议列表（对标 AutoSuggestBox 的 Popup + ListView） -->
    <Teleport to="body">
      <Transition name="asb-popup">
        <div
          v-if="showPopup"
          class="win-asb-popup"
          :style="popupStyle">
          <div class="win-asb-list">
            <div
              v-for="(item, idx) in filteredSuggestions"
              :key="itemKey(item, idx)"
              class="win-asb-item"
              :class="{ highlighted: idx === highlightIndex }"
              @mousedown.prevent="chooseSuggestion(item)"
              @mouseenter="highlightIndex = idx">
              <!-- ItemTemplate（对标 AutoSuggestBox.ItemTemplate），缺省渲染 Display + Subtitle -->
              <slot
                v-if="$slots.item"
                name="item"
                :item="item"
                :index="idx"
                :highlighted="idx === highlightIndex" />
              <template v-else>
                <div class="win-asb-item-text">{{ displayOf(item) }}</div>
                <div v-if="subtitleOf(item)" class="win-asb-item-sub">{{ subtitleOf(item) }}</div>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import WinTextBox from './WinTextBox.vue';
import WinButton from './WinButton.vue';

/**
 * WinAutoSuggestBox —— 对标 WinUI 3 的 Microsoft.UI.Xaml.Controls.AutoSuggestBox
 *
 * 组合关系（与官方一致）：AutoSuggestBox 内部包含一个 TextBox（本实现复用 WinTextBox，
 * 因此 Header / PlaceholderText / Description / Text 等行为与官方 TextBox 完全一致）。
 *
 * 官方字段名映射（props，命名与官方 1:1）：
 *   Text                 -> prop `text`                 (v-model / v-model:text)
 *   PlaceholderText      -> prop `placeholderText`
 *   QueryIcon            -> prop `queryIcon`            (末端 WinButton 的图标字形)
 *   Header               -> prop `header` / #header slot
 *   Description          -> prop `description` / #description slot
 *   ItemsSource          -> prop `itemsSource`          (外部数据源)
 *   TextMemberPath       -> prop `textMemberPath`       (选中后回写 / 过滤用文本字段)
 *   DisplayMemberPath    -> prop `displayMemberPath`    (列表展示字段)
 *   SubtitleMemberPath   -> prop `subtitleMemberPath`   (列表副标题字段，官方扩展字段)
 *   MaxSuggestionHeight  -> prop `maxSuggestionHeight`  (0 = 自适应)
 *   IsSuggestionListOpen -> prop `isSuggestionListOpen` (v-model:isSuggestionListOpen)
 *   UpdateTextOnSelect   -> prop `updateTextOnSelect`
 *   OpenOnFocus          -> prop `openOnFocus`          (聚焦即展开；官方默认仅输入后展开)
 *   ItemTemplate         -> #item slot                 (对标 DataTemplate)
 *   HeaderTemplate       -> #header slot
 *   DescriptionTemplate  -> #description slot
 *
 * 官方事件映射（emits）：
 *   TextChanged          -> emit `textChanged`      ({ reason, text })
 *                              reason: 'UserInput' | 'ProgrammaticChange' | 'SuggestionChosen'
 *   SuggestionChosen     -> emit `suggestionChosen` ({ selectedItem })
 *   QuerySubmitted       -> emit `querySubmitted`   ({ queryText, chosenSuggestion })
 *
 * 官方方法（通过 ref 暴露）：
 *   Focus(FocusState)    -> `focus()`  (转发至内部 WinTextBox)
 */

const props = defineProps({
  text: { type: String, default: '' },
  placeholderText: { type: String, default: '搜索' },
  queryIcon: { type: String, default: '\uE721' }, // 放大镜
  queryButtonAriaLabel: { type: String, default: '执行查询' },
  header: { type: String, default: '' },
  description: { type: String, default: '' },
  itemsSource: { type: Array as () => any[], default: null },
  textMemberPath: { type: String, default: '' },
  displayMemberPath: { type: String, default: '' },
  subtitleMemberPath: { type: String, default: '' },
  maxSuggestionHeight: { type: Number, default: 0 },
  isSuggestionListOpen: { type: Boolean, default: false },
  updateTextOnSelect: { type: Boolean, default: true },
  openOnFocus: { type: Boolean, default: false }
});

const emit = defineEmits([
  'update:text',
  'textChanged',
  'suggestionChosen',
  'querySubmitted',
  'update:isSuggestionListOpen'
]);

const rootRef = ref<HTMLElement | null>(null);
const textBoxRef = ref<InstanceType<typeof WinTextBox> | null>(null);
const isFocused = ref(false);
const highlightIndex = ref(0);

// Text（对标 AutoSuggestBox.Text）
const text = computed({
  get: () => props.text,
  set: (v) => emit('update:text', v)
});

const hasQuery = computed(() => (props.text ?? '').trim().length > 0);

// 成员取值：字符串项直接返回；对象项按 path 取值，缺省回退 ToString
const getMember = (item: any, path: string): string => {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (path) return String(item[path] ?? '');
  return item.label ?? item.title ?? item.text ?? item.toString();
};

const displayOf = (item: any) =>
  getMember(item, props.displayMemberPath) || getMember(item, props.textMemberPath);
const textOf = (item: any) =>
  getMember(item, props.textMemberPath) || getMember(item, props.displayMemberPath);
const subtitleOf = (item: any) =>
  props.subtitleMemberPath ? getMember(item, props.subtitleMemberPath) : '';

const itemKey = (item: any, idx: number) =>
  item && (item.key ?? item.id) != null ? (item.key ?? item.id) : idx;

// 自动过滤（对标官方：你通常在 TextChanged 中自行过滤 ItemsSource；
// 这里提供默认 contains 过滤以开箱即用，消费者也可监听 textChanged 自行赋值 itemsSource）
const filteredSuggestions = computed(() => {
  const items = props.itemsSource;
  if (!items || !Array.isArray(items)) return [];
  const q = (props.text ?? '').trim().toLowerCase();
  if (!q) return items.slice();
  return items.filter((it) => {
    const t = textOf(it).toLowerCase();
    const d = displayOf(it).toLowerCase();
    const s = subtitleOf(it).toLowerCase();
    return t.includes(q) || d.includes(q) || (s && s.includes(q));
  });
});

const showPopup = computed(() => {
  if (!filteredSuggestions.value.length) return false;
  if (props.isSuggestionListOpen) return true;
  if (!isFocused.value) return false;
  if (props.openOnFocus) return true;
  return hasQuery.value;
});

watch(showPopup, (v) => emit('update:isSuggestionListOpen', v));

// 弹窗定位（对标官方 Popup 在控件下方展开）
const popupPos = ref({ top: '0px', left: '0px', width: '320px' });

const updatePopupPos = () => {
  if (!rootRef.value || !showPopup.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  const popupWidth = Math.max(320, rect.width);
  let left = rect.left;
  const maxRight = window.innerWidth - 12;
  if (left < 12) left = 12;
  if (left + popupWidth > maxRight) left = maxRight - popupWidth;
  popupPos.value = {
    top: rect.bottom + 8 + 'px',
    left: left + 'px',
    width: popupWidth + 'px'
  };
};

const popupStyle = computed(() => ({
  ...popupPos.value,
  maxHeight: props.maxSuggestionHeight > 0 ? props.maxSuggestionHeight + 'px' : undefined
}));

// ===== 文本变化转发（含抑制因编程回写导致的回声） =====
let suppressEcho = false;

const onTextBoxTextChanged = (e: { reason: string; text: string }) => {
  if (suppressEcho) return;
  emit('textChanged', { reason: e.reason, text: e.text });
  highlightIndex.value = 0;
};

// ===== 键盘导航（ArrowUp/Down/Enter/Escape） =====
const onKeydown = (e: KeyboardEvent) => {
  if (!showPopup.value) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightIndex.value = Math.min(highlightIndex.value + 1, filteredSuggestions.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = filteredSuggestions.value[highlightIndex.value];
    if (item) chooseSuggestion(item);
    else submitQuery();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closePopup();
  }
};

/**
 * SuggestionChosen + QuerySubmitted（点击 / 方向键+回车选中某一项）
 */
const chooseSuggestion = (item: any) => {
  emit('textChanged', { reason: 'SuggestionChosen', text: textOf(item) });
  emit('suggestionChosen', { selectedItem: item });
  if (props.updateTextOnSelect) {
    suppressEcho = true;
    text.value = textOf(item);
    nextTick(() => {
      suppressEcho = false;
    });
  }
  emit('querySubmitted', { queryText: text.value, chosenSuggestion: item });
  closePopup();
};

/**
 * QuerySubmitted（无 chosenSuggestion）：回车或点击 QueryIcon
 */
const submitQuery = () => {
  const item = filteredSuggestions.value[highlightIndex.value];
  if (item) {
    chooseSuggestion(item);
  } else {
    emit('querySubmitted', { queryText: props.text, chosenSuggestion: null });
    closePopup();
  }
};

const closePopup = () => {
  isFocused.value = false;
  emit('update:isSuggestionListOpen', false);
  (textBoxRef.value as any)?.blur?.();
};

// 聚焦态：同步 isFocused 并定位弹窗
const syncFocus = () => {
  isFocused.value = true;
  nextTick(updatePopupPos);
};

// 点击外部关闭
let outsideHandler: ((e: MouseEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

onMounted(() => {
  outsideHandler = (e: MouseEvent) => {
    const t = e.target as Node;
    if (rootRef.value && !rootRef.value.contains(t) && !(e.target as HTMLElement)?.closest?.('.win-asb-popup')) {
      if (showPopup.value) closePopup();
    }
  };
  document.addEventListener('mousedown', outsideHandler);

  resizeHandler = () => updatePopupPos();
  window.addEventListener('resize', resizeHandler);
  window.addEventListener('scroll', resizeHandler, true);

  // 监听内部 WinTextBox 的聚焦/失焦：通过 DOM 事件桥接
  const tbEl = rootRef.value?.querySelector('.win-tb-field');
  tbEl?.addEventListener('focus', syncFocus);
  tbEl?.addEventListener('blur', () => {
    // 允许建议项 mousedown.prevent 阻止失焦，避免误关
    setTimeout(() => {
      if (!showPopup.value) isFocused.value = false;
    }, 120);
  });
});

onBeforeUnmount(() => {
  if (outsideHandler) document.removeEventListener('mousedown', outsideHandler);
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('scroll', resizeHandler, true);
  }
});

defineExpose({
  focus: () => (textBoxRef.value as any)?.focus?.(),
  selectAll: () => (textBoxRef.value as any)?.selectAll?.(),
  blur: () => (textBoxRef.value as any)?.blur?.()
});
</script>

<style scoped>
.win-asb {
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* QueryIcon：复用 WinTextBox #suffix，框内末端小长方形 WinButton */
.win-asb-query-btn.win-btn {
  height: 28px;
  padding: 0 9px;
  flex-shrink: 0;
  border-radius: 4px;
  margin-left: 2px;
}
.win-asb-query-btn .icon {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1;
}
.win-asb-query-btn.win-btn:hover .icon {
  color: var(--text-primary);
}

/* ===== 建议列表弹窗（对标 AutoSuggestBox Popup + ListView） ===== */
.win-asb-popup {
  position: fixed;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  background: var(--flyout-bg);
  backdrop-filter: var(--flyout-backdrop);
  -webkit-backdrop-filter: var(--flyout-backdrop);
  border: 1px solid var(--stroke-surface-flyout);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.win-asb-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.win-asb-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--faster-duration);
}
.win-asb-item.highlighted,
.win-asb-item:hover {
  background: var(--subtle-secondary);
}

.win-asb-item-text {
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-asb-item-sub {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 动画 ===== */
.asb-popup-enter-active {
  transition: opacity 0.167s ease, transform 0.167s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.asb-popup-leave-active {
  transition: opacity 0.083s ease;
}
.asb-popup-enter-from {
  opacity: 0;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top center;
}
.asb-popup-leave-to {
  opacity: 0;
}
</style>
