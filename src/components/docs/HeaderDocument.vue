<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['toggle-sidebar'])

// Track if header is scrolled out of view
const isHeaderHidden = ref(false)

function handleScroll() {
  // Get the nav height from CSS variable
  const navHeight = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--md-nav-height') || '50'
  )
  isHeaderHidden.value = window.scrollY > navHeight
}

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav class="docs-navbar" :class="{ 'header-hidden': isHeaderHidden }">
    <div class="container">
      <!-- Left: Menu toggle -->
      <button class="menu-toggle" @click="emit('toggle-sidebar')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span class="menu-text">Menu</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.docs-navbar {
  position: fixed;
  top: var(--md-nav-height);
  right: 0;
  left: 0;
  z-index: 900;
  height: 48px;
  background-color: color-mix(in srgb, var(--md-c-bg) 94%, transparent);
  border-bottom: 1px solid var(--md-c-divider-light);
  backdrop-filter: blur(12px);
}

/* When main header is scrolled out of view */
.docs-navbar.header-hidden {
  top: 0;
}

.container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
  padding: 0 24px;
}

/* Menu toggle (left) */
.menu-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--md-c-brand);
  font-size: 14px;
  font-weight: 500;
  padding-left: 10px;
}

.menu-toggle svg {
  color: var(--md-c-text-2);
}

.menu-toggle:hover svg {
  color: var(--md-c-text-1);
}

.menu-text {
  color: var(--md-c-brand);
}

@media (min-width: 960px) {
  .docs-navbar {
    display: none;
  }
}

@media (max-width: 959px) {
  .docs-navbar.header-hidden {
    top: var(--md-nav-height);
  }
}

@media (max-width: 640px) {
  .container {
    padding: 0 16px;
  }

  .menu-text {
    font-size: 13px;
  }
}
</style>
