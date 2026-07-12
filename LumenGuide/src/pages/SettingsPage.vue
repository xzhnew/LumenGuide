<template>
  <WinPage title="设置" description="调整网站的主题、动画与导航偏好" pageKey="settings" :showActions="false">
    <WinExpander>
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="icon" style="font-size: 20px; width: 25px; text-align: center;">{{ '\uE706' }}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 14px;">主题</span>
            <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">选择应用的颜色模式</span>
          </div>
        </div>
      </template>
      <WinRadioButton value="system" v-model="themeSetting">跟随系统</WinRadioButton>
      <WinRadioButton value="light" v-model="themeSetting">浅色</WinRadioButton>
      <WinRadioButton value="dark" v-model="themeSetting">深色</WinRadioButton>
    </WinExpander>

    <WinExpander>
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="icon" style="font-size: 20px; width: 25px; text-align: center;">{{ '\uE8AB' }}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 14px;">页面切换动画</span>
            <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">切换页面时的动画风格</span>
          </div>
        </div>
      </template>
      <WinRadioButton value="entrance" v-model="animSetting">入场（上滑）</WinRadioButton>
      <WinRadioButton value="drill" v-model="animSetting">过渡（左右）</WinRadioButton>
      <WinRadioButton value="fade" v-model="animSetting">淡入</WinRadioButton>
    </WinExpander>

    <WinSettingsCard>
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="icon" style="font-size: 20px; width: 25px; text-align: center;">{{ '\uF594' }}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 14px;">导航窗格位置</span>
            <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">选择导航栏的位置</span>
          </div>
        </div>
      </template>
      <WinComboBox :options="navPositionOptions" :modelValue="navPositionIndex" :disabled="isSmall" @update:modelValue="v => navPosition = navPositionValues[v]" />
    </WinSettingsCard>

    <WinExpander>
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="icon" style="font-size: 20px; width: 25px; text-align: center;">{{ '\uE946' }}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 14px;">关于</span>
            <span style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">项目信息</span>
          </div>
        </div>
      </template>
      <div class="about-section">
        <div class="about-title">
          <span class="icon about-logo">{{ '\uE8A5' }}</span>
          <span>全端启萌</span>
        </div>
        <p class="about-desc">
          基于 WinUI 3 风格为小白设计的电脑 “ 零 ” 基础教程
        </p>
        <div class="about-version">版本 26.07.06</div>
      </div>
    </WinExpander>
  </WinPage>
</template>

<script setup>
import { computed, inject } from 'vue';
import WinPage from '../components/WinPage.vue';
import WinExpander from '../components/WinExpander.vue';
import WinRadioButton from '../components/WinRadioButton.vue';
import WinSettingsCard from '../components/WinSettingsCard.vue';
import WinComboBox from '../components/WinComboBox.vue';

// 我的功能：直接复用 App 提供的全局状态（响应式、写入即持久化到 localStorage）
const themeSetting = inject('themeSetting');
const animSetting = inject('animSetting');
const navPosition = inject('navPosition');

// 小屏（<640px）由 WinNavigationView provide；小屏下导航锁定为「简约」模式，不允许切换
const isSmallScreen = inject('isSmallScreen');
const isSmall = computed(() => !!isSmallScreen?.value);

// 导航窗格位置：自动 / 顶部 / 简约（小屏下锁定为「简约」）
const navPositionOptions = [
  { label: '自动', value: 'Auto' },
  { label: '顶部', value: 'Top' },
  { label: '简约', value: 'Small' }
];
const navPositionValues = navPositionOptions.map(option => option.value);
const navPositionIndex = computed(() => {
  // 小屏：锁定显示「简约」(Small)，且 WinComboBox 被禁用，无法切换到其他模式
  if (isSmall.value) return Math.max(0, navPositionValues.indexOf('Small'));
  return Math.max(0, navPositionValues.indexOf(navPosition.value));
});
</script>

<style scoped>
.about-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  text-align: center;
  padding: 16px 0;
}

.about-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.about-logo {
  font-size: 28px;
  color: var(--accent-base);
}

.about-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 420px;
  margin: 0;
}

.about-version {
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
