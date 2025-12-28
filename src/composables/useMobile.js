import { ref, onMounted, onUnmounted } from 'vue'

const BREAKPOINT = 960

/**
 * Composable for responsive/mobile detection
 * @param {number} breakpoint - Width breakpoint in pixels (default: 960)
 * @returns {{ isMobile: import('vue').Ref<boolean>, updateViewport: () => void }}
 */
export function useMobile(breakpoint = BREAKPOINT) {
  const isMobile = ref(false)

  function updateViewport() {
    isMobile.value = window.innerWidth < breakpoint
  }

  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateViewport)
  })

  return { isMobile, updateViewport }
}

