<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['toggle-sidebar', 'toggle-toc'])

defineProps({
  tocOpen: { type: Boolean, default: false }
})

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

      <!-- Right: On this page toggle -->
      <button class="toc-toggle" :class="{ active: tocOpen }" @click="emit('toggle-toc')">
        <span class="toc-text">On this page</span>
        <svg class="toc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
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
  z-index: 800;
  height: 48px;
  background-color: var(--md-c-bg);
  border-bottom: 1px solid var(--md-c-divider-light);
}

/* When main header is scrolled out of view */
.docs-navbar.header-hidden {
  top: 0;
}

.container {
  display: flex;
  justify-content: space-between;
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

/* TOC toggle (right) */
.toc-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--md-c-text-2);
  font-size: 14px;
  font-weight: 500;
  transition: color 0.25s;
  padding-right: 10px;
}

.toc-toggle:hover,
.toc-toggle.active {
  color: var(--md-c-text-1);
}

.toc-chevron {
  transition: transform 0.25s;
}

.toc-toggle.active .toc-chevron {
  transform: rotate(180deg);
}

@media (min-width: 960px) {
  .docs-navbar {
    display: none;
  }
}

@media (max-width: 640px) {
  .container {
    padding: 0 16px;
  }

  .menu-text,
  .toc-text {
    font-size: 13px;
  }
}
</style>
