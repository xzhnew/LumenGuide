<template>
  <Teleport to="body">
    <aside class="article-toc" v-if="headings.length > 0" aria-label="本文内容目录">
      <div class="toc-head">
        <span>本文内容</span>
        <button
          class="toc-copy-head"
          type="button"
          :title="copied ? '已复制链接 ✓' : '复制本节链接'"
          :aria-label="copied ? '已复制链接' : '复制本节链接'"
          @click="copyLink()"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <path d="M15 7h2A5 5 0 0 1 17 17h-2" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>
      </div>
      <span class="toc-copied-tip" v-if="copied">已复制链接 ✓</span>
      <nav class="toc-nav">
        <button
          v-for="(h, i) in headings"
          :key="i"
          type="button"
          class="toc-link"
          :class="{ active: activeId === h.id, ['toc-level-' + h.level]: true }"
          @click="scrollToHeading(h.id)"
        >{{ h.text }}<span
            class="toc-copy"
            role="button"
            :title="'复制此节链接'"
            :aria-label="'复制此节链接：' + h.text"
            @click.stop="copyLink(h.id)"
          ><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2A5 5 0 0 1 17 17h-2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg></span></button>
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
import { ref, onMounted, onUnmounted, watch, nextTick, inject, computed } from 'vue';

const props = defineProps<{
  /** 文章/序言正文容器的 HTMLElement ref（用于提取标题） */
  container: HTMLElement | null;
}>();

// 当前页面 key（由 App 通过 provide 注入），用于拼接分享锚点 #page/anchor
const currentPageRef = inject<{ value: string }>('currentPage');
const pageKey = computed(() => currentPageRef?.value || '');

interface Heading {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3
}

const headings = ref<Heading[]>([]);
const activeId = ref<string>('');
const feedback = ref<string>('');
const copied = ref(false);

// 用 replaceState 改网址的 # 片段（不触发 hashchange、不污染历史记录）。
// 传入空串则清除片段。
const setHash = (hash: string) => {
  const target = hash ? '#' + hash : '';
  const newUrl = location.pathname + location.search + target;
  if (location.hash === target) return;
  history.replaceState(null, '', newUrl);
};

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

// ====== 滚动时高亮当前标题 + 同步网址锚点（scrollspy） ======
// 用滚动监听替代 IntersectionObserver：能稳定算出「当前所在小节」，
// 既驱动蓝色高亮，也把网址写成 #页面/小节。
let detachScrollSpy: (() => void) | null = null;
let rafPending = false;

const updateActiveByScroll = () => {
  rafPending = false;
  const sc = document.querySelector('.win-nav-content') as HTMLElement | null;
  const els = props.container?.querySelectorAll('h2, h3');
  if (!sc || !els || els.length === 0) return;
  const cTop = sc.getBoundingClientRect().top;
  const offset = 90; // 距容器顶部 90px 内算「当前节」
  let current = '';
  els.forEach((el) => {
    const top = el.getBoundingClientRect().top - cTop;
    if (top <= offset) current = (el as HTMLElement).id;
  });
  if (current) {
    activeId.value = current;
    if (pageKey.value) setHash(pageKey.value + '/' + current);
  } else if (pageKey.value) {
    setHash(pageKey.value); // 还在第一条标题之上，仅记页码
  }
};

const onScroll = () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(updateActiveByScroll);
};

const attachScrollSpy = () => {
  if (!props.container) return;
  detachScrollSpy?.();
  const sc = document.querySelector('.win-nav-content') as HTMLElement | null;
  if (sc) {
    sc.addEventListener('scroll', onScroll, { passive: true });
    detachScrollSpy = () => sc.removeEventListener('scroll', onScroll);
  }
  // 初始化一次（落定当前锚点）
  updateActiveByScroll();
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
  if (pageKey.value) setHash(pageKey.value + '/' + id);
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

// ====== 复制本节 / 指定节分享链接 ======
let copyTimer: number | undefined;
const copyLink = async (id?: string) => {
  const page = pageKey.value;
  const anchor = id || activeId.value;
  const hash = anchor ? `${page}/${anchor}` : page;
  const url = location.origin + location.pathname + (hash ? '#' + hash : '');
  const done = () => {
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copied.value = false; }, 1600);
  };
  try {
    await navigator.clipboard.writeText(url);
    done();
  } catch {
    // 兜底：旧浏览器 / 非 https 环境
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(ta);
    done();
  }
};

// ====== 生命周期 ======
watch(
  () => props.container,
  async (val) => {
    await nextTick();
    extractHeadings();
    attachScrollSpy();
  },
  { immediate: true }
);

onMounted(async () => {
  await nextTick();
  // 稍等确保 v-html 已渲染、滚动容器就绪
  setTimeout(() => {
    extractHeadings();
    attachScrollSpy();
  }, 150);
});

onUnmounted(() => {
  detachScrollSpy?.();
  clearTimeout(copyTimer);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toc-copy-head {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 2px;
  border-radius: 4px;
  transition: background .15s, color .15s;
  line-height: 0;
}
.toc-copy-head:hover {
  color: var(--text-primary);
  background: var(--subtle-secondary);
}
.toc-copied-tip {
  display: block;
  font-size: 12px;
  color: var(--accent-base);
  margin: 0 0 6px;
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
  padding: 5px 26px 5px 10px;
  color: var(--text-secondary);
  border-radius: 4px;
  position: relative;
  transition: background .15s, color .15s;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.toc-copy {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  opacity: 0;
  cursor: pointer;
  transition: opacity .15s, color .15s;
  line-height: 0;
}
.toc-link:hover .toc-copy {
  opacity: 1;
}
.toc-copy:hover {
  color: var(--accent-base);
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
