<template>
  <div>
    <div style="position: relative;">
      <h1 class="page-header">HyperlinkButton</h1>
      <p class="page-description">A button that appears as a hyperlink.</p>
      <div class="page-header-actions">
        <WinButton
          subtle
          @click="toggleTheme"
          style="width: 32px; height: 32px; padding: 0; min-width: 0;">
          <span class="icon">&#xE793;</span>
        </WinButton>
        <WinToggleButton
          v-model="isFavoriteState"
          subtle
          @update:modelValue="toggleFavorite"
          style="width: 32px; height: 32px; padding: 0; min-width: 0;">
          <span class="icon">{{ isFavoriteState ? '&#xE735;' : '&#xE734;' }}</span>
        </WinToggleButton>
      </div>
    </div>

    <WinControlExample headerText="A HyperlinkButton with NavigateUri." :theme="pageTheme">
      <template #example>
        <WinHyperlinkButton
          navigateUri="https://www.microsoft.com"
          :openInNewWindow="true"
          :disabled="disableControl1">
          Microsoft home page
        </WinHyperlinkButton>
      </template>
      <template #options>
        <WinCheckBox v-model="disableControl1">
          Disable hyperlink button
        </WinCheckBox>
      </template>
    </WinControlExample>

    <WinControlExample headerText="A HyperlinkButton handling the Click event." :theme="pageTheme">
      <template #example>
        <WinHyperlinkButton @click="goToToggleButton">
          Go to ToggleButton
        </WinHyperlinkButton>
      </template>
    </WinControlExample>
  </div>
</template>

<script setup>
import { ref, inject, computed, watch } from 'vue';
import WinHyperlinkButton from '../components/WinHyperlinkButton.vue';
import WinControlExample from '../components/WinControlExample.vue';
import WinCheckBox from '../components/WinCheckBox.vue';
import WinButton from '../components/WinButton.vue';
import WinToggleButton from '../components/WinToggleButton.vue';
import { useFavorites } from '../composables/useFavorites';
import { usePageTheme } from '../composables/usePageTheme';

const currentPage = inject('currentPage');
const pageKey = computed(() => currentPage?.value || 'hyperlinkbutton');

const { isFavorite: checkFavorite, toggleFavorite: toggleFav } = useFavorites();
const isFavorite = computed(() => checkFavorite(pageKey.value));
const isFavoriteState = ref(isFavorite.value);

watch(isFavorite, (newVal) => {
  isFavoriteState.value = newVal;
});

const toggleFavorite = () => {
  toggleFav(pageKey.value);
};

const { pageTheme, toggleTheme: doToggleTheme } = usePageTheme('system');
const toggleTheme = () => doToggleTheme();

const disableControl1 = ref(false);

const goToToggleButton = () => {
  currentPage.value = 'togglebutton';
};
</script>

<style scoped>
.page-header {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.page-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.page-header-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 4px;
  align-items: center;
}

.icon {
  font-size: 16px;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
}
</style>
