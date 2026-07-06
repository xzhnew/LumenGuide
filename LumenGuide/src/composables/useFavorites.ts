import { ref, computed } from 'vue';

const STORAGE_KEY = 'winui-favorites';

// 使用数组而非 Set，确保 Vue 响应式系统能追踪到变化
const favoritesArr = ref<string[]>([]);

function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      favoritesArr.value = JSON.parse(stored);
    }
  } catch {
    favoritesArr.value = [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesArr.value));
  } catch { /* ignore */ }
}

// 初始化加载
loadFavorites();

export function useFavorites() {
  const favorites = computed(() => favoritesArr.value);

  function isFavorite(pageKey: string): boolean {
    return favoritesArr.value.includes(pageKey);
  }

  function toggleFavorite(pageKey: string): boolean {
    const idx = favoritesArr.value.indexOf(pageKey);
    if (idx > -1) {
      favoritesArr.value = favoritesArr.value.filter(k => k !== pageKey);
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
    saveFavorites();
  }

  return { favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite };
}
