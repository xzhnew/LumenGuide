<template>
  <button class="win-hyperlink-button" :disabled="disabled" @click="$emit('click', $event)">
    <slot />
  </button>
</template>

<script setup lang="ts">
// 超链接按钮：外观是文字超链接（主题蓝 + hover 下划线），行为是按钮（点击触发 click）。
// 对标 WinUI 的 HyperlinkButton，用于「查看全部」等内页跳转类操作。
const props = defineProps<{ disabled?: boolean }>();
defineEmits<{ (e: 'click', ev: MouseEvent): void }>();
</script>

<style scoped>
.win-hyperlink-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: var(--accent-base);
  cursor: pointer;
  text-decoration: none;
  transition: color var(--faster-duration);
}
.win-hyperlink-button:hover:not(:disabled) {
  color: var(--accent-hover);
  text-decoration: underline;
}
.win-hyperlink-button:disabled {
  color: var(--text-disabled, #9a9a9a);
  cursor: default;
  text-decoration: none;
}
</style>
