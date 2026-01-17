import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // Get initial theme from localStorage or system preference
  const getInitialTheme = () => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  const theme = ref(getInitialTheme())
  const isDark = ref(theme.value === 'dark')

  // Apply theme to document
  function applyTheme(newTheme) {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Toggle theme
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    isDark.value = theme.value === 'dark'
    localStorage.setItem('theme', theme.value)
    applyTheme(theme.value)
  }

  // Watch for changes
  watch(
    theme,
    (newTheme) => {
      applyTheme(newTheme)
    },
    { immediate: true },
  )

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        theme.value = e.matches ? 'dark' : 'light'
        isDark.value = e.matches
      }
    })
  }

  return {
    theme,
    isDark,
    toggleTheme,
  }
})
