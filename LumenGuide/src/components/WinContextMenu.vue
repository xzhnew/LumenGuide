<template>
  <Teleport to="body">
    <div v-if="visible" class="win-context-menu-overlay" @pointerdown="close" @contextmenu.prevent="close"></div>
    <div
      v-if="visible"
      ref="menuRef"
      class="win-context-menu"
      :style="posStyle"
      @contextmenu.prevent>
      <div v-for="(item, i) in items" :key="i">
        <div
          v-if="item.kind === 'separator'"
          class="win-context-menu-separator"
          role="separator"></div>
        <div
          v-else
          class="win-context-menu-item"
          :class="{ 'is-disabled': item.disabled }"
          role="menuitem"
          @click="onItemClick(item, i)">
          <span v-if="item.icon" class="icon win-context-menu-icon">{{ item.icon }}</span>
          <span class="win-context-menu-label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="win-context-menu-shortcut">{{ item.shortcut }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 视口坐标（clientX/clientY）或一个 DOMRect */
  anchor: { type: Object, default: null },
  items: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'select']);

const visible = ref(false);
const isClosing = ref(false);
const posStyle = ref({});
const menuRef = ref(null);
const openDirection = ref('down');

watch(() => props.open, async (val) => {
  if (val) {
    visible.value = true;
    isClosing.value = false;
    await nextTick();
    position();
    focusFirst();
  } else if (visible.value) {
    isClosing.value = true;
    setTimeout(() => {
      visible.value = false;
      isClosing.value = false;
    }, 120);
  }
}, { immediate: true });

const position = () => {
  const a = props.anchor;
  if (!a) return;
  const margin = 8;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const w = menuRef.value?.offsetWidth || 220;
  const h = menuRef.value?.offsetHeight || 240;

  // 鼠标右键坐标（clientX/Y）场景
  if (typeof a.clientX === 'number') {
    let left = a.clientX;
    let top = a.clientY;
    if (left + w + margin > viewW) left = Math.max(margin, viewW - w - margin);
    if (top + h + margin > viewH) top = Math.max(margin, viewH - h - margin);
    openDirection.value = 'down';
    posStyle.value = { left: left + 'px', top: top + 'px' };
    return;
  }

  // 元素 rect 场景
  const r = a;
  const spaceBelow = viewH - r.bottom - 4 - margin;
  const spaceAbove = r.top - 4 - margin;
  const goDown = spaceBelow >= spaceAbove;
  openDirection.value = goDown ? 'down' : 'up';
  posStyle.value = goDown
    ? { top: (r.bottom + 4) + 'px', left: r.left + 'px' }
    : { bottom: (viewH - r.top + 4) + 'px', left: r.left + 'px' };
};

const focusFirst = () => {
  const el = menuRef.value?.querySelector?.('.win-context-menu-item:not(.is-disabled)');
  el?.focus?.();
};

const close = () => emit('close');

const onItemClick = (item, index) => {
  if (item.disabled) return;
  emit('select', item, index);
};

const onKeydown = (e) => {
  if (!visible.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = Array.from(menuRef.value?.querySelectorAll('.win-context-menu-item:not(.is-disabled)') || []);
    if (!items.length) return;
    const active = document.activeElement;
    const i = items.indexOf(active);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (document.activeElement?.classList?.contains('win-context-menu-item')) {
      e.preventDefault();
      document.activeElement.click();
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', close);
  window.addEventListener('blur', close);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', close);
  window.removeEventListener('blur', close);
});
</script>

<style>
.win-context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 10009;
}

.win-context-menu {
  position: fixed;
  z-index: 10010;
  min-width: 200px;
  max-width: min(320px, calc(100vw - 16px));
  padding: 4px;
  box-sizing: border-box;
  background: var(--material-solid, #fbfbfb);
  border: 1px solid var(--material-acrylic-border, rgba(0, 0, 0, 0.10));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: var(--flyout-backdrop, blur(30px));
  -webkit-backdrop-filter: var(--flyout-backdrop, blur(30px));
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  animation: ctxmenu-in 140ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.win-context-menu.is-closing {
  animation: ctxmenu-out 100ms ease forwards;
  pointer-events: none;
}

@keyframes ctxmenu-in {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes ctxmenu-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

.win-context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: var(--text-primary, #1a1a1a);
  font-size: 14px;
  line-height: 20px;
  user-select: none;
  outline: none;
  transition: background 100ms;
}

.win-context-menu-item:hover,
.win-context-menu-item:focus {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.06));
}

.win-context-menu-item:active {
  background: var(--subtle-tertiary, rgba(0, 0, 0, 0.03));
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.win-context-menu-item.is-disabled {
  color: var(--text-tertiary, rgba(0, 0, 0, 0.45));
  cursor: default;
  pointer-events: none;
}

.win-context-menu-icon {
  width: 16px;
  min-width: 16px;
  font-family: 'LumenGuideIcons', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
  font-size: 16px;
  line-height: 16px;
  text-align: center;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.win-context-menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-context-menu-shortcut {
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.45));
  margin-left: 12px;
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
}

.win-context-menu-separator {
  height: 1px;
  background: var(--stroke-divider, rgba(0, 0, 0, 0.08));
  margin: 4px 8px;
}

html.theme-dark .win-context-menu,
.example-theme-wrapper.theme-dark .win-context-menu {
  background: var(--material-solid, #2b2b2b);
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
</style>
