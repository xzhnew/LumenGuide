<template>
  <div
    class="win-tb"
    :class="{ 'is-readonly': isReadOnly, 'is-disabled': disabled }"
    :style="rootStyle">
    <!-- Header（对标 TextBox.Header，object 内容；这里支持 string + #header slot） -->
    <div v-if="header || $slots.header" class="win-tb-header">
      <slot name="header">{{ header }}</slot>
    </div>

    <!-- 边框（对标 TextBox 控件模板中的 Border + ContentElement） -->
    <div
      class="win-tb-border"
      :class="{ focused: isFocused, 'has-clear': showClearButton }">
      <div class="win-tb-content">
        <!-- Prefixes（对标 TextBox.Prefixes 集合，web 用 #prefix slot 承载） -->
        <span v-if="$slots.prefix" class="win-tb-prefix"><slot name="prefix" /></span>

        <!-- 单行：input；多行(AcceptsReturn)：textarea —— 与官方 TextBox 同一定位 -->
        <input
          v-if="!acceptsReturn"
          ref="fieldRef"
          class="win-tb-field"
          type="text"
          :value="text"
          :readonly="isReadOnly"
          :disabled="disabled"
          :maxlength="maxLength > 0 ? maxLength : undefined"
          :spellcheck="isSpellCheckEnabled"
          :inputmode="inputMode"
          :autocapitalize="textPredictionAttr"
          :autocorrect="textPredictionAttr"
          :autocomplete="isTextPredictionEnabled ? 'on' : 'off'"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
          @paste="onPaste"
          @select="onSelect"
          @cut="onCut"
          @copy="onCopy"
        />
        <textarea
          v-else
          ref="fieldRef"
          class="win-tb-field win-tb-textarea"
          :value="text"
          :readonly="isReadOnly"
          :disabled="disabled"
          :maxlength="maxLength > 0 ? maxLength : undefined"
          :spellcheck="isSpellCheckEnabled"
          :inputmode="inputMode"
          :autocapitalize="textPredictionAttr"
          :autocorrect="textPredictionAttr"
          :autocomplete="isTextPredictionEnabled ? 'on' : 'off'"
          :style="textareaStyle"
          @input="onInput"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
          @paste="onPaste"
          @select="onSelect"
          @cut="onCut"
          @copy="onCopy"
        ></textarea>

        <!-- Suffixes（对标 TextBox.Suffixes 集合，web 用 #suffix slot 承载） -->
        <span v-if="$slots.suffix" class="win-tb-suffix"><slot name="suffix" /></span>

        <!-- 清除按钮（对标 WinUI 3 TextBox.ClearButtonVisible 的 ClearButton） -->
        <button
          v-if="showClearButton"
          class="win-tb-clear"
          type="button"
          aria-label="清除"
          @mousedown.prevent="clearText">
          <span class="icon">&#xE711;</span>
        </button>
      </div>

      <!-- PlaceholderText（对标 TextBox 模板内 PlaceholderTextContentPresenter，无文本时显示） -->
      <span
        v-if="!hasText && placeholderText"
        class="win-tb-placeholder"
        :class="{ 'is-multiline': acceptsReturn }"
        aria-hidden="true">{{ placeholderText }}</span>
    </div>

    <!-- Description（对标 TextBox.Description，object 内容；支持 string + #description slot） -->
    <div v-if="description || $slots.description" class="win-tb-description">
      <slot name="description">{{ description }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

/**
 * WinTextBox —— 对标 WinUI 3 的 Microsoft.UI.Xaml.Controls.TextBox
 *
 * 官方字段名映射（props，命名与官方 1:1 对应）：
 *   Text                              -> prop `text`                 (v-model / v-model:text)
 *   PlaceholderText                   -> prop `placeholderText`
 *   Header                            -> prop `header` / #header slot        (官方为 object 内容)
 *   Description                       -> prop `description` / #description slot (官方为 object 内容)
 *   AcceptsReturn                     -> prop `acceptsReturn`
 *   IsReadOnly                        -> prop `isReadOnly`
 *   IsEnabled                         -> prop `disabled`             (控件 IsEnabled 的 web 等价)
 *   MaxLength                         -> prop `maxLength`            (0 = 不限制，对标官方)
 *   TextWrapping                      -> prop `textWrapping`         ('NoWrap'|'Wrap'|'WrapWholeWords')
 *   TextAlignment                     -> prop `textAlignment`        ('Left'|'Center'|'Right'|'Justify')
 *   HorizontalTextAlignment           -> prop `horizontalTextAlignment`
 *   IsSpellCheckEnabled               -> prop `isSpellCheckEnabled`
 *   IsTextPredictionEnabled           -> prop `isTextPredictionEnabled`
 *   InputScope                        -> prop `inputScope`           (映射为 inputmode/type)
 *   ClearButtonVisible                -> prop `clearButtonVisible`   (WinUI 3 独有属性)
 *   CharacterCasing                   -> prop `characterCasing`      ('Normal'|'Lower'|'Upper')
 *   SelectionHighlightColor           -> prop `selectionHighlightColor` (CSS 颜色，对标 Brush)
 *   DesiredCandidateWindowAlignment    -> prop `desiredCandidateWindowAlignment` (web 无等价，保留字段)
 *   IsHandwritingViewEnabled          -> prop `isHandwritingViewEnabled`      (web 无等价，保留字段)
 *   IsColorFontEnabled                -> prop `isColorFontEnabled`            (web 无等价，保留字段)
 *   PreventKeyboardDisplayOnProgrammaticFocus -> prop `preventKeyboardDisplayOnProgrammaticFocus`
 *   UndoLimit                         -> prop `undoLimit`           (-1 = 不限制)
 *   Prefixes / Suffixes 集合          -> #prefix / #suffix slot      (官方为 UIElement 集合)
 *   HeaderTemplate / DescriptionTemplate -> 由 #header / #description slot 充当（DataTemplate 等价）
 *
 * 官方事件映射（emits）：
 *   TextChanged          -> emit `textChanged`            ({ reason, text })
 *   TextChanging          -> emit `textChanging`          ({ cancel, isContentChanging, checkedLength, text })  // cancel 可被消费者置 true 以阻止
 *   SelectionChanged      -> emit `selectionChanged`      ({ selectionStart, selectionLength, selectedText })
 *   Paste                 -> emit `paste`                 ({ handled, format, text })   // handled 可被置 true 以接管
 *   Cut                  -> emit `cut`                   ({ text })
 *   Copy                 -> emit `copy`                  ({ text })
 *   CandidateWindowBoundsChanged -> emit `candidateWindowBoundsChanged` ({ rect })
 *
 * 官方方法映射（通过 ref 暴露，defineExpose）：
 *   SelectAll()          -> `selectAll()`
 *   Select(start,length) -> `select(start, length)`
 *   GetRectFromCharacterIndex(i, trailing) -> `getRectFromCharacterIndex(index, trailingEdge?)`
 *   Focus(FocusState)    -> `focus()`
 *   Undo() / Redo()      -> `undo()` / `redo()`
 *   Copy() / Cut() / Paste() -> `copy()` / `cut()` / `pasteFromClipboard()`
 *   CanUndo / CanRedo    -> 只读计算属性（ref 形式暴露）
 *   SelectedText / SelectionStart / SelectionLength -> 可读写（ref 形式暴露）
 */

const props = defineProps({
  text: { type: String, default: '' },
  placeholderText: { type: String, default: '' },
  header: { type: String, default: '' },
  description: { type: String, default: '' },
  acceptsReturn: { type: Boolean, default: false },
  isReadOnly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  maxLength: { type: Number, default: 0 },
  textWrapping: { type: String, default: 'NoWrap' }, // 'NoWrap' | 'Wrap' | 'WrapWholeWords'
  textAlignment: { type: String, default: 'Left' }, // 'Left' | 'Center' | 'Right' | 'Justify'
  horizontalTextAlignment: { type: String, default: '' }, // '' | 'Left' | 'Center' | 'Right' | 'Justify'
  isSpellCheckEnabled: { type: Boolean, default: true },
  isTextPredictionEnabled: { type: Boolean, default: true },
  inputScope: { type: String, default: 'Default' },
  clearButtonVisible: { type: Boolean, default: true },
  characterCasing: { type: String, default: 'Normal' }, // 'Normal' | 'Lower' | 'Upper'
  selectionHighlightColor: { type: String, default: '' }, // CSS 颜色
  desiredCandidateWindowAlignment: { type: String, default: 'Default' },
  isHandwritingViewEnabled: { type: Boolean, default: true },
  isColorFontEnabled: { type: Boolean, default: true },
  preventKeyboardDisplayOnProgrammaticFocus: { type: Boolean, default: false },
  undoLimit: { type: Number, default: -1 } // -1 = 不限制
});

const emit = defineEmits([
  'update:text',
  'textChanged',
  'textChanging',
  'selectionChanged',
  'paste',
  'cut',
  'copy',
  'candidateWindowBoundsChanged'
]);

const fieldRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const isFocused = ref(false);

// Text（对标 TextBox.Text）—— 单向绑定+emit，支持 v-model
const hasText = computed(() => (props.text ?? '').length > 0);

const showClearButton = computed(() =>
  props.clearButtonVisible && hasText.value && !props.isReadOnly && !props.disabled
);

// InputScope -> inputmode（web 触摸键盘等价）
const inputMode = computed(() => {
  switch (props.inputScope) {
    case 'Number':
    case 'NumericPin':
    case 'Digits':
      return 'numeric';
    case 'TelephoneNumber':
      return 'tel';
    case 'EmailSmtpAddress':
      return 'email';
    case 'Url':
      return 'url';
    case 'Search':
      return 'search';
    case 'Decimal':
      return 'decimal';
    default:
      return 'text';
  }
});

// IsTextPredictionEnabled -> autocapitalize/autocorrect（web 近似等价）
const textPredictionAttr = computed(() => (props.isTextPredictionEnabled ? 'on' : 'off'));

// 文本对齐：HorizontalTextAlignment 优先于 TextAlignment（官方语义一致）
const resolvedTextAlign = computed(() =>
  (props.horizontalTextAlignment || props.textAlignment || 'Left').toLowerCase()
);

// textarea 的折行：TextWrapping=Wrap/NoWrap；WrapWholeWords 在 web 等价于 wrap
const textareaStyle = computed(() => ({
  textAlign: resolvedTextAlign.value as any,
  whiteSpace: props.textWrapping === 'NoWrap' ? 'pre' : 'pre-wrap',
  overflowWrap: (props.textWrapping === 'WrapWholeWords' ? 'break-word' : 'normal') as
    | 'break-word'
    | 'normal'
}));

const rootStyle = computed(() => {
  const s: Record<string, string> = {};
  if (props.selectionHighlightColor) s['--tb-sel'] = props.selectionHighlightColor;
  return s;
});

// ===== 撤销/重做缓冲（对标 TextBox.Undo/Redo + UndoLimit） =====
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);
const canUndo = ref(false);
const canRedo = ref(false);

const pushUndo = (prev: string) => {
  if (undoStack.value.length && undoStack.value[undoStack.value.length - 1] === prev) return;
  if (props.undoLimit >= 0 && undoStack.value.length >= props.undoLimit) {
    undoStack.value.shift();
  }
  undoStack.value.push(prev);
  redoStack.value = [];
  syncUndoRedoFlags();
};

const syncUndoRedoFlags = () => {
  canUndo.value = undoStack.value.length > 0;
  canRedo.value = redoStack.value.length > 0;
};

const setTextValue = (val: string, opts: { undo?: boolean } = {}) => {
  if (opts.undo) pushUndo(props.text);
  emit('update:text', val);
};

// ===== 输入处理 =====
const onInput = (e: Event) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  let raw = el.value;

  // CharacterCasing（对标 TextBox.CharacterCasing，会改变实际存储文本）
  if (props.characterCasing === 'Upper') raw = raw.toUpperCase();
  else if (props.characterCasing === 'Lower') raw = raw.toLowerCase();

  // TextChanging（对标 TextBox.TextChanging，可被取消）
  const changingArgs = {
    cancel: false,
    isContentChanging: raw !== props.text,
    checkedLength: raw.length,
    text: raw
  };
  emit('textChanging', changingArgs);
  if (changingArgs.cancel) {
    // 还原到之前的值
    el.value = props.text;
    return;
  }

  // 若大小写转换导致与 DOM 不一致，回写
  if (raw !== el.value) el.value = raw;

  setTextValue(raw, { undo: true });

  // TextChanged（对标 TextBox.TextChanged）
  emit('textChanged', { reason: 'UserInput', text: raw });
};

const onFocus = () => {
  isFocused.value = true;
};

const onBlur = () => {
  isFocused.value = false;
};

const onKeydown = (e: KeyboardEvent) => {
  // 单行 TextBox：Enter 默认不插入换行（与官方一致）
  if (e.key === 'Enter' && !props.acceptsReturn) {
    e.preventDefault();
  }
};

// 选中文本变化 -> SelectionChanged（对标 TextBox.SelectionChanged）
const onSelect = () => {
  const sel = readSelection();
  emit('selectionChanged', {
    selectionStart: sel.start,
    selectionLength: sel.length,
    selectedText: sel.text
  });
};

const onCut = (e: ClipboardEvent) => {
  const sel = readSelection();
  emit('cut', { text: sel.text });
  // 不阻止默认，浏览器会执行剪切并触发 input
};

const onCopy = (e: ClipboardEvent) => {
  const sel = readSelection();
  emit('copy', { text: sel.text });
};

// Paste（对标 TextBox.Paste，TextControlPasteEventArgs.Handled 可被置 true 以接管）
const onPaste = (e: ClipboardEvent) => {
  const text = e.clipboardData?.getData('text') ?? '';
  const args = { handled: false, format: 'Text', text };
  emit('paste', args);
  if (args.handled) {
    e.preventDefault();
  }
};

// ===== 选中信息读取（SelectionStart / SelectionLength / SelectedText 对标） =====
const readSelection = () => {
  const el = fieldRef.value;
  if (!el) return { start: 0, length: 0, text: '' };
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const length = Math.abs(end - start);
  const text = (el.value ?? '').substring(Math.min(start, end), Math.max(start, end));
  return { start: Math.min(start, end), length, text };
};

// SelectedText（可读写，对标 TextBox.SelectedText）
const selectedText = computed({
  get: () => readSelection().text,
  set: (v: string) => {
    const el = fieldRef.value as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const { start, length } = readSelection();
    const cur = el.value ?? '';
    const next = cur.slice(0, start) + v + cur.slice(start + length);
    el.value = next;
    setTextValue(next, { undo: true });
    emit('textChanged', { reason: 'ProgrammaticChange', text: next });
  }
});

// SelectionStart / SelectionLength（只读，对标 TextBox.SelectionStart / SelectionLength）
const selectionStart = computed(() => readSelection().start);
const selectionLength = computed(() => readSelection().length);

// ===== 方法（defineExpose） =====
const focus = (opts: { preventScroll?: boolean } = {}) => {
  if (props.preventKeyboardDisplayOnProgrammaticFocus) {
    // web 无法完全阻止软键盘，但可避免滚动
    fieldRef.value?.focus({ preventScroll: opts.preventScroll });
  } else {
    fieldRef.value?.focus({ preventScroll: opts.preventScroll });
  }
};

const selectAll = () => {
  fieldRef.value?.select();
  onSelect();
};

const select = (start: number, length: number) => {
  const el = fieldRef.value as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  const end = Math.min(start + length, el.value.length);
  el.setSelectionRange(start, end);
  onSelect();
};

const getRectFromCharacterIndex = (index: number, trailingEdge = false) => {
  const el = fieldRef.value as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return { x: 0, y: 0, width: 0, height: 0 };
  const rect = el.getBoundingClientRect();
  const value = el.value ?? '';
  const idx = Math.max(0, Math.min(index, value.length));

  // 单行：用 canvas 测量到 idx 的文本宽度；多行：仅做水平近似（web 限制，已注明）
  let textWidth = 0;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
      textWidth = ctx.measureText(value.substring(0, idx)).width;
    }
  }
  const paddingLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0;
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 18;
  const x = rect.left + paddingLeft + textWidth + (trailingEdge ? 1 : 0);
  const y = rect.top + (parseFloat(getComputedStyle(el).paddingTop) || 0);
  return { x, y, width: 1, height: lineHeight };
};

const clearText = () => {
  setTextValue('', { undo: true });
  emit('textChanged', { reason: 'ProgrammaticChange', text: '' });
  nextTick(() => fieldRef.value?.focus());
};

const undo = () => {
  if (!undoStack.value.length) return;
  const prev = undoStack.value.pop()!;
  redoStack.value.push(props.text);
  emit('update:text', prev);
  emit('textChanged', { reason: 'ProgrammaticChange', text: prev });
  syncUndoRedoFlags();
};

const redo = () => {
  if (!redoStack.value.length) return;
  const next = redoStack.value.pop()!;
  undoStack.value.push(props.text);
  emit('update:text', next);
  emit('textChanged', { reason: 'ProgrammaticChange', text: next });
  syncUndoRedoFlags();
};

const copy = () => {
  const { text } = readSelection();
  if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
};

const cut = () => {
  const sel = readSelection();
  if (sel.text && navigator.clipboard) {
    navigator.clipboard.writeText(sel.text).catch(() => {});
    selectedText.value = '';
  }
};

const pasteFromClipboard = () => {
  if (!navigator.clipboard) return;
  navigator.clipboard.readText().then((t) => {
    const el = fieldRef.value as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const { start, length } = readSelection();
    const cur = el.value ?? '';
    const next = cur.slice(0, start) + t + cur.slice(start + length);
    el.value = next;
    setTextValue(next, { undo: true });
    emit('textChanged', { reason: 'ProgrammaticChange', text: next });
  });
};

onMounted(() => {
  syncUndoRedoFlags();
});

onBeforeUnmount(() => {
  undoStack.value = [];
  redoStack.value = [];
});

defineExpose({
  focus,
  blur: () => fieldRef.value?.blur(),
  selectAll,
  select,
  getRectFromCharacterIndex,
  undo,
  redo,
  copy,
  cut,
  pasteFromClipboard,
  clearText,
  // 只读/可读写镜像属性
  get canUndo() {
    return canUndo.value;
  },
  get canRedo() {
    return canRedo.value;
  },
  get selectedText() {
    return selectedText.value;
  },
  set selectedText(v: string) {
    selectedText.value = v;
  },
  get selectionStart() {
    return selectionStart.value;
  },
  get selectionLength() {
    return selectionLength.value;
  }
});
</script>

<style scoped>
.win-tb {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

/* Header（对标 TextBox.Header） */
.win-tb-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

/* 边框（对标 TextBox 控件模板 Border） */
.win-tb-border {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 36px;
  background: var(--ctrl-fill-default);
  border: 1px solid var(--ctrl-border-rest);
  border-bottom-color: var(--ctrl-strong-stroke);
  border-radius: 4px;
  transition: background var(--fast-duration), border-color var(--fast-duration);
  box-sizing: border-box;
  overflow: hidden;
}

.win-tb-border:hover {
  background: var(--ctrl-fill-secondary);
}

.win-tb-border.focused {
  background: var(--ctrl-fill-default);
  border-color: var(--ctrl-border-rest);
  border-bottom-color: var(--accent-base);
  border-bottom-width: 2px;
  padding-bottom: 0;
}

/* 内容行：prefix | 输入区 | suffix | 清除按钮 */
.win-tb-content {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.win-tb-field {
  flex: 1;
  /* 关键：覆盖全局 user-select:none，否则无法编辑/选择文本 */
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  min-width: 0;
  padding: 7px 12px;
  box-sizing: border-box;
  text-align: v-bind(resolvedTextAlign);
}

/* 选中高亮（对标 TextBox.SelectionHighlightColor） */
.win-tb-field::selection {
  background: var(--tb-sel, var(--accent-base));
  color: var(--accent-text);
}

.win-tb-textarea {
  resize: vertical;
  min-height: 36px;
  padding: 7px 12px;
}

.win-tb-field::placeholder {
  color: var(--text-tertiary);
  opacity: 1;
}

.win-tb-field:read-only {
  color: var(--text-primary);
}

/* 前缀/后缀（对标 TextBox.Prefixes / Suffixes） */
.win-tb-prefix,
.win-tb-suffix {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  font-size: 14px;
  flex-shrink: 0;
  padding: 0 2px;
}
.win-tb-prefix {
  padding-left: 10px;
}
.win-tb-suffix {
  padding-right: 6px;
}

/* 清除按钮（对标 WinUI 3 TextBox ClearButton） */
.win-tb-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 6px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;
  padding: 0;
  transition: background var(--faster-duration), color var(--faster-duration);
}
.win-tb-clear:hover {
  background: var(--subtle-secondary);
  color: var(--text-primary);
}
.win-tb-clear .icon {
  font-size: 11px;
  line-height: 1;
}

/* PlaceholderText（对标 TextBox PlaceholderTextContentPresenter，无文本时覆盖显示） */
.win-tb-placeholder {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  pointer-events: none;
  color: var(--text-tertiary);
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  z-index: 0;
}
.win-tb-placeholder.is-multiline {
  align-items: flex-start;
  padding-top: 9px;
  white-space: normal;
}
.win-tb-field {
  position: relative;
  z-index: 1;
}
.win-tb-clear {
  z-index: 2;
}

/* Description（对标 TextBox.Description） */
.win-tb-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* 只读 / 禁用态 */
.win-tb.is-readonly .win-tb-border {
  background: var(--ctrl-fill-tertiary);
}
.win-tb.is-disabled .win-tb-border {
  background: var(--ctrl-fill-disabled);
  border-bottom-color: var(--ctrl-strong-stroke-disabled);
  cursor: not-allowed;
}
.win-tb.is-disabled .win-tb-field {
  color: var(--text-disabled);
  cursor: not-allowed;
}
.win-tb.is-disabled .win-tb-clear {
  display: none;
}
</style>
