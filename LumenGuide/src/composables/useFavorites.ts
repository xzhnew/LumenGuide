import { ref, computed } from 'vue';

const STORAGE_KEY = 'winui-favorites';
const PINNED_KEY = 'winui-pinned-favorites';
// 精选收藏最多展示条数（首页/搜索框的「精选收藏」区固定 6 条）
export const MAX_PINNED = 6;

// 使用数组而非 Set，确保 Vue 响应式系统能追踪到变化
const favoritesArr = ref<string[]>([]);
const pinnedArr = ref<string[]>([]);

function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      favoritesArr.value = JSON.parse(stored);
    }
  } catch {
    favoritesArr.value = [];
  }
  try {
    const stored = localStorage.getItem(PINNED_KEY);
    if (stored) {
      // 过滤掉已不在收藏里的脏数据
      const f = JSON.parse(stored);
      pinnedArr.value = Array.isArray(f) ? f.filter((k: string) => favoritesArr.value.includes(k)) : [];
    }
  } catch {
    pinnedArr.value = [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesArr.value));
  } catch { /* ignore */ }
}

function savePinned() {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedArr.value));
  } catch { /* ignore */ }
}

// 初始化加载
loadFavorites();

export function useFavorites() {
  const favorites = computed(() => favoritesArr.value);
  const pinned = computed(() => pinnedArr.value);

  function isFavorite(pageKey: string): boolean {
    return favoritesArr.value.includes(pageKey);
  }

  function isPinned(pageKey: string): boolean {
    return pinnedArr.value.includes(pageKey);
  }

  function toggleFavorite(pageKey: string): boolean {
    const idx = favoritesArr.value.indexOf(pageKey);
    if (idx > -1) {
      favoritesArr.value = favoritesArr.value.filter(k => k !== pageKey);
      // 同步从精选移除（取消收藏后不应再精选）
      if (pinnedArr.value.includes(pageKey)) {
        pinnedArr.value = pinnedArr.value.filter(k => k !== pageKey);
        savePinned();
      }
    } else {
      favoritesArr.value = [...favoritesArr.value, pageKey];
    }
    saveFavorites();
    return !(idx > -1);
  }

  function addFavorite(pageKey: string) {
    if (!favoritesArr.value.includes(pageKey)) {
      favoritesArr.value = [...favoritesArr.value, pageKey];
      saveFavorites();
    }
  }

  function removeFavorite(pageKey: string) {
    favoritesArr.value = favoritesArr.value.filter(k => k !== pageKey);
    if (pinnedArr.value.includes(pageKey)) {
      pinnedArr.value = pinnedArr.value.filter(k => k !== pageKey);
      savePinned();
    }
    saveFavorites();
  }

  // 切换精选。返回 'pinned'（新增精选）/ 'unpinned'（取消精选）/ 'full'（已满，未操作）
  // 若已精选则取消；若未精选且未满则新增；若已满则忽略。
  function togglePin(pageKey: string): 'pinned' | 'unpinned' | 'full' {
    const idx = pinnedArr.value.indexOf(pageKey);
    if (idx > -1) {
      pinnedArr.value = pinnedArr.value.filter(k => k !== pageKey);
      savePinned();
      return 'unpinned';
    }
    if (!favoritesArr.value.includes(pageKey)) return 'full';
    if (pinnedArr.value.length >= MAX_PINNED) return 'full';
    pinnedArr.value = [...pinnedArr.value, pageKey];
    savePinned();
    return 'pinned';
  }

  // 「精选收藏」的 key 列表：优先用用户手动精选；未设任何精选时回退到全部收藏的前 MAX_PINNED 个
  // （按收藏顺序，最早收藏的排前面）。调用方负责 map 成页面元信息。
  const pinnedFavoritesKeys = computed<string[]>(() => {
    const p = pinnedArr.value.filter(k => k !== 'home');
    if (p.length) return p;
    return favoritesArr.value.filter(k => k !== 'home').slice(0, MAX_PINNED);
  });

  return {
    favorites,
    pinned,
    pinnedFavoritesKeys,
    isFavorite,
    isPinned,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    togglePin,
  };
}
