<template>
  <div
    ref="surfaceRef"
    class="win-context-menu-surface"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointermove="onPointerMove"
    @pointercancel="onPointerUp"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchmove.passive="onTouchMove"
    @touchcancel="onTouchEnd">
    <slot></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['request']);
const surfaceRef = ref(null);

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 12;

// 若浏览器支持 Pointer Events（含 iOS 13+），优先走 pointer 路径；
// touch 事件仅作为旧浏览器兜底，避免与 pointer 事件重复触发。
const hasPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

let timer = null;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let activePointerId = null;
let pendingTouch = false;

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const fireRequest = (x, y, target) => {
  emit('request', { clientX: x, clientY: y, target });
};

const onContextMenu = (e) => {
  clearTimer();
  // 桌面端右键：直接用鼠标坐标
  fireRequest(e.clientX, e.clientY, e.target);
};

const onPointerDown = (e) => {
  // 只处理触摸/笔的主指针；鼠标右键走 contextmenu 事件
  if (e.pointerType === 'mouse') return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;

  activePointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  currentX = e.clientX;
  currentY = e.clientY;
  clearTimer();
  pendingTouch = true;

  timer = setTimeout(() => {
    if (!pendingTouch) return;
    pendingTouch = false;
    fireRequest(currentX, currentY, e.target);
  }, LONG_PRESS_MS);
};

const onPointerMove = (e) => {
  if (e.pointerId !== activePointerId) return;
  currentX = e.clientX;
  currentY = e.clientY;
  if (Math.hypot(currentX - startX, currentY - startY) > MOVE_THRESHOLD_PX) {
    clearTimer();
    pendingTouch = false;
  }
};

const onPointerUp = (e) => {
  if (e.pointerId !== activePointerId) return;
  activePointerId = null;
  clearTimer();
  pendingTouch = false;
};

// iOS Safari / 旧浏览器兜底：touch 长按时阻止系统菜单出现
const onTouchStart = (e) => {
  if (hasPointerEvents) return; // pointer 路径已处理
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  startX = t.clientX;
  startY = t.clientY;
  currentX = t.clientX;
  currentY = t.clientY;
  pendingTouch = true;
  clearTimer();
  timer = setTimeout(() => {
    if (!pendingTouch) return;
    pendingTouch = false;
    fireRequest(currentX, currentY, e.target);
  }, LONG_PRESS_MS);
};

const onTouchMove = (e) => {
  if (hasPointerEvents) return;
  if (e.touches.length !== 1) {
    clearTimer();
    pendingTouch = false;
    return;
  }
  const t = e.touches[0];
  currentX = t.clientX;
  currentY = t.clientY;
  if (Math.hypot(currentX - startX, currentY - startY) > MOVE_THRESHOLD_PX) {
    clearTimer();
    pendingTouch = false;
  }
};

const onTouchEnd = () => {
  if (hasPointerEvents) return;
  clearTimer();
  pendingTouch = false;
};
</script>

<style>
.win-context-menu-surface {
  display: block;
  width: 100%;
  height: 100%;
  /* 阻止 iOS Safari 在长按文本/图片时弹出原生系统菜单，
     让自定义右键菜单成为唯一入口。 */
  -webkit-touch-callout: none;
}
</style>
