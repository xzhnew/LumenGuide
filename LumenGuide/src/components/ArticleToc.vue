<template>
  <Teleport to="body">
    <aside class="article-toc" v-if="headings.length > 0" aria-label="本文内容目录">
      <div class="toc-head">本文内容</div>
      <nav class="toc-nav">
        <button
          v-for="(h, i) in headings"
          :key="i"
          type="button"
          class="toc-link"
          :class="{ active: activeId === h.id, ['toc-level-' + h.level]: true }"
          @click="scrollToHeading(h.id)"
        >{{ h.text }}</button>
      </nav>
      <div class="toc-feedback">
        <span class="toc-feedback-label">此页面是否有帮助？</span>
        <div class="toc-feedback-btns">
          <button
            class="toc-thumb"
            :class="{ voted: feedback === 'up' }"
            @click="vote('up')"
            aria-label="有帮助"
            title="有帮助"
          >&#x2713;</button>
          <button
            class="toc-thumb"
            :class="{ voted: feedback === 'down' }"
            @click="vote('down')"
            aria-label="没有帮助"
            title="没有帮助"
          >&#x2717;</button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps<{
  /** 文章/序言正文容器的 HTMLElement ref（用于提取标题） */
  container: HTMLElement | null;
}>();

interface Heading {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3
}

const headings = ref<Heading[]>([]);
const activeId = ref<string>('');
const feedback = ref<string>('');

// ====== 从容器中提取 h2/h3 标题 ======
const extractHeadings = () => {
  if (!props.container) {
    headings.value = [];
    return;
  }
  const els = props.container.querySelectorAll('h2, h3');
  const list: Heading[] = [];
  els.forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (!text) return;
    let id = el.id;
    if (!id) {
      // 自动生成 id：去空格转小写
      id = text.replace(/\s+/g, '-').toLowerCase();
      // 去掉非字母数字连字符开头结尾的字符
      id = id.replace(/[^a-zA-Z0-9\u4e00-\u9fff\-]/g, '');
      el.id = id;
    }
    list.push({ id, text, level: el.tagName === 'H3' ? 3 : 2 });
  });
  headings.value = list;
};

// ====== 滚动时高亮当前标题（IntersectionObserver） ======
let observer: IntersectionObserver | null = null;

const setupObserver = () => {
  if (!props.container) return;
  cleanupObserver();

  const els = props.container.querySelectorAll('h2, h3');
  if (els.length === 0) return;

  observer = new IntersectionObserver(
    (entries) => {
      let bestId = '';
      let bestTop = -Infinity;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.boundingClientRect.top >= 0) {
          const top = entry.boundingClientRect.top;
          if (top < Infinity && (bestId === '' || top < bestTop)) {
            bestId = (entry.target as HTMLElement).id || '';
            bestTop = top;
          }
        }
      });
      if (!bestId) {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            bestId = (entry.target).id || '';
          }
        });
      }
      if (bestId) activeId.value = bestId;
    },
    {
      rootMargin: '-60px 0px -50% 0px',
      threshold: [0, 0.25, 0.5, 1]
    }
  );

  els.forEach((el) => observer!.observe(el));
};

const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// ====== 点击目录跳转 ======
const scrollToHeading = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;

  // 在 .win-nav-content 内滚动
  const scrollContainer = document.querySelector('.win-nav-content') as HTMLElement | null;
  if (scrollContainer) {
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const targetTop = el.getBoundingClientRect().top;
    scrollContainer.scrollTo({
      top: scrollContainer.scrollTop + (targetTop - containerTop) - 16,
      behavior: 'smooth'
    });
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  activeId.value = id;
};

// ====== 反馈投票 ======
const vote = (type: string) => {
  if (feedback.value === type) {
    feedback.value = ''; // 取消
  } else {
    feedback.value = type;
  }
  try {
    const key = 'toc-feedback-' + (props.container?.closest('[data-page]')?.getAttribute('data-page') || 'unknown');
    localStorage.setItem(key, feedback.value);
  } catch { /* ignore */ }
};

// ====== 生命周期 ======
watch(
  () => props.container,
  async (val) => {
    await nextTick();
    extractHeadings();
    setupObserver();
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  // 稍等确保 v-html 已渲染
  setTimeout(() => {
    extractHeadings();
    setupObserver();
  }, 150);
});

onUnmounted(() => {
  cleanupObserver();
});
</script>

<style scoped>
/* ====== 右侧栏目录（固定定位，钉在视口右上角，对齐文章标题） ====== */
.article-toc {
  position: fixed;
  top: 170px;       /* 离标题区域远一点 */
  right: 140px;     /* 靠近正文右侧 */
  width: 200px;
  z-index: 40;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 106px);
  overflow-y: auto;
  /* 无背景、无边框、无圆角 —— 扁平透明 */
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
}
.article-toc::-webkit-scrollbar {
  display: none; /* Chrome/Edge/Safari */
}

.toc-head {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  padding: 4px 0 10px 0;
  letter-spacing: 0.3px;
}

.toc-nav {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toc-link {
  display: block;
  width: 100%;
  font: inherit;
  font-size: 14px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 5px 8px 5px 10px;
  color: var(--text-secondary);
  border-radius: 4px;
  position: relative;
  transition: background .15s, color .15s;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.toc-link:hover {
  color: var(--text-primary);
  background: var(--subtle-secondary);
}
/* 导航同款蓝色竖条指示器（截图2风格）—— active 时左侧细蓝线 */
.toc-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 3px;
  height: 16px;
  background: var(--accent-base);
  border-radius: 2px;
  opacity: 0;
  transition: opacity .15s;
}
.toc-link.active {
  color: var(--text-primary);
  font-weight: 500;
}
.toc-link.active::before {
  opacity: 1;
}

/* h3 缩进 */
.toc-link.toc-level-3 {
  padding-left: 26px;
  font-size: 13px;
}
.toc-link.toc-level-3::before {
  left: 16px;
}

/* ====== 底部反馈（分隔线 + 👍👎） ====== */
.toc-feedback {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--stroke-divider);
}
.toc-feedback-label {
  font-size: 13px;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
}
.toc-feedback-btns {
  display: flex;
  gap: 8px;
}
.toc-thumb {
  font-family: inherit;
  font-size: 15px;
  background: none;
  border: none;
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  transition: background .15s, transform .1s, color .15s;
  line-height: 1;
  color: var(--text-tertiary);
}
.toc-thumb:hover {
  color: var(--text-primary);
  background: var(--subtle-secondary);
}
.toc-thumb:active {
  transform: scale(0.9);
}
.toc-thumb.voted {
  color: var(--accent-base);
  background: color-mix(in srgb, var(--accent-base) 12%, transparent);
}

/* 仅大屏桌面端显示 */
@media (max-width: 1350px) {
  .article-toc { display: none !important; }
}
</style>
