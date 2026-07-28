<script setup>
import { RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import { useSearchStore } from '@/stores/searchStore'
import { useThemeStore } from '@/stores/themeStore'
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import SearchModal from '@/components/search/SearchModal.vue'

const docs = useDocsStore()
const searchStore = useSearchStore()
const themeStore = useThemeStore()
const isDropdownMobile = ref(false)
const expandedMobileSection = ref(null)
let lockedScrollY = 0
let scrollLockStyles = null

// Tutorial docs
const tutorialDocs = computed(() => docs.tutorialDocs)

// Post docs
const postDocs = computed(() => docs.postDocs)

function lockBodyScroll() {
  lockedScrollY = window.scrollY
  scrollLockStyles = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyTouchAction: document.body.style.touchAction,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyLeft: document.body.style.left,
    bodyRight: document.body.style.right,
    bodyWidth: document.body.style.width
  }

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.touchAction = 'none'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lockedScrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function unlockBodyScroll() {
  if (!scrollLockStyles) return

  const scrollY = lockedScrollY

  document.documentElement.style.overflow = scrollLockStyles.htmlOverflow
  document.body.style.overflow = scrollLockStyles.bodyOverflow
  document.body.style.touchAction = scrollLockStyles.bodyTouchAction
  document.body.style.position = scrollLockStyles.bodyPosition
  document.body.style.top = scrollLockStyles.bodyTop
  document.body.style.left = scrollLockStyles.bodyLeft
  document.body.style.right = scrollLockStyles.bodyRight
  document.body.style.width = scrollLockStyles.bodyWidth
  scrollLockStyles = null

  window.scrollTo(0, scrollY)
}

// Keep the current reading position while the mobile navigation is open.
watch(isDropdownMobile, (isOpen) => {
  if (isOpen) {
    lockBodyScroll()
  } else {
    unlockBodyScroll()
  }
})

onBeforeUnmount(unlockBodyScroll)

function onToggleDropdown() {
  isDropdownMobile.value = !isDropdownMobile.value
  expandedMobileSection.value = null
}

function toggleMobileExpand(docId) {
  if (expandedMobileSection.value === docId) {
    expandedMobileSection.value = null
  } else {
    expandedMobileSection.value = docId
  }
}

function openSearch() {
  searchStore.open()
}
</script>

<template>
  <header id="header" class="main-header">
    <div class="navbar-container">
      <!-- Logo -->
      <router-link to="/" class="icon-link">
        <img src="/favicon.ico" width="36" height="36">
        <span class="text">Tutorial dashboard</span>
      </router-link>

      <div class="content">
        <!-- Search -->
        <button class="search" type="button" aria-label="Open search" @click="openSearch">
          <span class="icon-search">
            <svg xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <span class="search-mobile-label">Open search</span>
          <span class="search-title">Search</span>
          <kbd class="search-shortcut">Ctrl K</kbd>
        </button>

        <!-- Desktop Navbar -->
        <nav class="navbar">
          <!-- Tutorial docs - direct links -->
          <div
            class="navbar-item"
            v-for="doc in tutorialDocs"
            :key="doc.id"
          >
            <router-link :to="`/docs/${doc.id}`">
              <span>{{ doc.title.toUpperCase() }}</span>
            </router-link>
          </div>

          <!-- Dropdown items (Posts only) -->
          <div class="navbar-item dropdown-trigger" v-for="post in postDocs" :key="post.id">
            <div class="dropdown-label">
              <span>{{ post.title.toUpperCase() }}</span>
              <svg class="dropdown-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            <!-- Dropdown Menu -->
            <div class="dropdown-menu" v-if="post.children && post.children.length">
              <router-link
                v-for="child in post.children.filter(c => c.type === 'folder')"
                :key="child.id"
                :to="`/posts/${post.id}/${child.id}`"
                class="dropdown-category-link"
              >
                <span class="category-title">{{ child.title || child.name }}</span>
                <svg class="category-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </router-link>
            </div>
          </div>

          <!-- Explorer Link -->
          <div class="navbar-item">
            <router-link to="/explorer" class="explorer-link" title="File Explorer">
              FILE EXPLORER
            </router-link>
          </div>

          <!-- Theme switch -->
          <div class="theme-switch" @click="themeStore.toggleTheme" :title="themeStore.isDark ? 'Chế độ sáng' : 'Chế độ tối'">
            <div class="switch-track" :class="{ dark: themeStore.isDark }">
              <div class="switch-thumb">
                <svg v-if="!themeStore.isDark" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"></line>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"></line>
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </div>
            </div>
          </div>
        </nav>

        <!-- Mobile hamburger -->
        <button
          class="hamburger-btn"
          type="button"
          :aria-expanded="isDropdownMobile"
          aria-label="Toggle navigation menu"
          @click="onToggleDropdown"
        >
          <span class="hamburger-container">
            <span class="hamburger-top"></span>
            <span class="hamburger-middle"></span>
            <span class="hamburger-bottom"></span>
          </span>
        </button>
      </div>
    </div>

    <!-- Mobile dropdown -->
    <div class="mobile-dropdown" :class="{ active: isDropdownMobile }" @click="onToggleDropdown">
      <div class="mobile-dropdown-container" @click.stop>
        <!-- All docs in one list -->
        <div class="mobile-section">
          <div class="mobile-section-title">Documentation</div>

          <!-- Tutorial docs - direct links -->
          <router-link
            v-for="doc in tutorialDocs"
            :key="doc.id"
            class="mobile-item"
            :to="`/docs/${doc.id}`"
            @click="onToggleDropdown"
          >
            <span>{{ doc.title }}</span>
          </router-link>

          <!-- Posts Docs - expandable -->
          <div v-for="post in postDocs" :key="post.id" class="mobile-expandable">
            <div
              class="mobile-item expandable"
              :class="{ expanded: expandedMobileSection === post.id }"
              @click="toggleMobileExpand(post.id)"
            >
               <span class="mobile-item-text">{{ post.title }}</span>
               <svg class="mobile-arrow" :class="{ expanded: expandedMobileSection === post.id }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <polyline points="6 9 12 15 18 9"></polyline>
               </svg>
            </div>

            <div class="mobile-categories" v-show="expandedMobileSection === post.id">
              <router-link
                v-for="child in post.children.filter(c => c.type === 'folder')"
                :key="child.id"
                :to="`/posts/${post.id}/${child.id}`"
                class="mobile-sub-item"
                @click="onToggleDropdown"
              >
                <span class="category-title">{{ child.title || child.name }}</span>
                <svg class="category-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Explorer Link Mobile -->
        <div class="mobile-explorer-section">
          <router-link
            to="/explorer"
            class="mobile-explorer-item"
            @click="onToggleDropdown"
          >
            <span class="mobile-explorer-title">File explorer</span>
          </router-link>
        </div>

        <!-- Mobile Theme Switch -->
        <div class="mobile-theme-section">
          <span class="mobile-theme-label">Giao diện</span>
          <div class="mobile-theme-switch" @click="themeStore.toggleTheme">
            <div class="mobile-switch-track" :class="{ dark: themeStore.isDark }">
              <div class="mobile-switch-thumb">
                <svg v-if="!themeStore.isDark" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"></line>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"></line>
                </svg>
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Search Modal -->
  <SearchModal />
</template>

<style scoped>
.main-header {
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1000;
  height: var(--md-nav-height);
  background-color: color-mix(in srgb, var(--md-c-bg) 88%, transparent);
  border-bottom: 1px solid var(--md-c-divider-light);
  backdrop-filter: blur(14px);
  box-shadow: 0 1px 0 rgba(15, 23, 42, .03);
}

/* When mobile dropdown is active, header becomes fixed */
.main-header:has(.mobile-dropdown.active) {
  position: fixed;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--md-nav-height);
  padding: 0 var(--md-page-gutter);
  gap: 10px;
  min-width: 0;
}

.icon-link {
  display: flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  min-height: 44px;
  border-radius: 8px;
  transition: opacity .2s, color .2s;
}

.icon-link img {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.icon-link:hover {
  opacity: .78;
}

.text {
  padding-left: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--md-c-text-1);
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content {
  display: flex;
  justify-content: end;
  align-items: center;
  min-width: 0;
  flex-grow: 1;
  gap: 8px;
}

.navbar {
  display: none;
}

.navbar-item {
  position: relative;
  color: var(--md-c-text-1);
  font-size: 11px;
  font-weight: 700;
  transition: color .2s, background-color .2s;
  white-space: nowrap;
  line-height: 1;
}

.navbar-item > a,
.dropdown-label {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 8px;
}

.navbar-item:hover {
  color: var(--md-c-brand);
}

.navbar-item > a:hover,
.dropdown-trigger:hover .dropdown-label {
  background: var(--md-c-brand-soft);
}

/* Dropdown trigger */
.dropdown-trigger {
  cursor: pointer;
}

.dropdown-label {
  gap: 4px;
}

.dropdown-arrow {
  transition: transform 0.2s;
}

.dropdown-trigger:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-trigger:hover .dropdown-menu {
  display: block;
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  padding: 6px;
  z-index: 1001;
  display: none;
}

.dropdown-category-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--md-c-text-1);
  text-decoration: none;
  border-radius: 6px;
  transition: color 0.2s, background-color 0.2s, transform 0.2s;
}

.dropdown-category-link:hover {
  background: var(--md-c-brand-soft);
  color: var(--md-c-brand);
}

.dropdown-category-link .category-title {
  font-weight: 500;
  flex: 1;
}

.dropdown-category-link .category-arrow {
  opacity: 0.5;
  transition: all 0.2s;
}

.dropdown-category-link:hover .category-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* Explorer */
.explorer-icon {
  font-size: 16px;
}

.explorer-icon-mobile {
  font-size: 16px;
  margin-right: 12px;
}

/* Search */
.search {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 44px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  color: var(--md-c-text-1);
  font-size: 14px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08);
  touch-action: manipulation;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.icon-search {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--md-c-text-2);
  transition: color 0.2s;
}

.search:hover {
  color: var(--md-c-brand);
  border-color: color-mix(in srgb, var(--md-c-brand) 35%, var(--md-c-divider-light));
  background: var(--md-c-brand-soft);
}

.search:hover .icon-search {
  color: var(--md-c-brand);
}

.search:active {
  transform: scale(.98);
}

.search:focus-visible {
  outline: 3px solid var(--md-c-focus);
  outline-offset: 2px;
  border-color: var(--md-c-brand);
}

.search-title {
  display: none;
  min-width: 0;
  color: var(--md-c-text-2);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  transition: color 0.2s;
}

.search-mobile-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.search-shortcut {
  display: none;
  margin-left: auto;
  padding: 3px 6px;
  font-size: 11px;
  line-height: 1;
  font-family: inherit;
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 4px;
  color: var(--md-c-text-2);
  box-shadow: 0 1px 0 rgba(15, 23, 42, .04);
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;
}

.search:hover .search-title,
.search:hover .search-shortcut {
  color: var(--md-c-brand);
}

.search:hover .search-shortcut {
  border-color: color-mix(in srgb, var(--md-c-brand) 45%, var(--md-c-divider-light));
  background: var(--md-c-bg);
}

/* Theme switch */
.theme-switch {
  display: none;
  align-items: center;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: 0;
  padding: 0;
}

.switch-track {
  position: relative;
  border-radius: 11px;
  display: block;
  width: 40px;
  height: 22px;
  background: var(--md-c-bg-mute);
  border: 1px solid var(--md-c-divider);
  transition: border-color .25s, background-color .25s;
}

.switch-track:hover {
  border: 1px solid var(--md-c-gray);
}

.switch-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 18px;
  height: 18px;
  background: var(--md-c-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
}

.switch-track.dark .switch-thumb {
  transform: translateX(18px);
  background-color: var(--md-c-bg);
}

.switch-thumb svg {
  width: 12px;
  height: 12px;
}

/* Hamburger button */
.hamburger-btn {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: transparent;
  border: 0;
  padding: 0;
  border-radius: 8px;
  color: var(--md-c-text-1);
  touch-action: manipulation;
}

.hamburger-btn:hover {
  background: var(--md-c-brand-soft);
}

.hamburger-container {
  position: relative;
  width: 20px;
  height: 20px;
  display: block;
}

.hamburger-top, .hamburger-middle, .hamburger-bottom {
  position: absolute;
  left: 2px;
  width: 16px;
  height: 2px;
  border-radius: 2px;
  background-color: var(--md-c-text-1);
  transition: opacity .2s, transform .2s, top .2s;
}

.hamburger-top {
  top: 5px;
}

.hamburger-middle {
  top: 9px;
}

.hamburger-bottom {
  top: 13px;
}

.hamburger-btn[aria-expanded="true"] .hamburger-top {
  top: 9px;
  transform: rotate(45deg);
}

.hamburger-btn[aria-expanded="true"] .hamburger-middle {
  opacity: 0;
}

.hamburger-btn[aria-expanded="true"] .hamburger-bottom {
  top: 9px;
  transform: rotate(-45deg);
}

/* Mobile dropdown */
.mobile-dropdown {
  position: fixed;
  top: var(--md-nav-height);
  bottom: 0;
  right: 0;
  left: 0;
  width: 100%;
  z-index: 998;
  display: none;
  height: calc(100dvh - var(--md-nav-height));
}

.mobile-dropdown.active {
  display: block;
}

/* Overlay to block background content */
.mobile-dropdown::before {
  content: '';
  position: fixed;
  top: var(--md-nav-height);
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--md-c-bg);
  z-index: -1;
}

.mobile-dropdown-container {
  position: relative;
  width: 100%;
  min-height: 100%;
  height: 100%;
  padding: 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  background: var(--md-c-bg);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.mobile-section {
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  margin-bottom: 16px;
}

.mobile-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
  color: var(--md-c-brand);
  margin-bottom: 16px;
}

.mobile-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin: 0 -16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--md-c-text-1);
  text-decoration: none;
  background: transparent;
  border: none;
  width: calc(100% + 32px);
  min-height: 48px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-item:hover,
.mobile-item:active {
  background: var(--md-c-brand-soft);
  color: var(--md-c-brand);
}

.mobile-item.expandable {
  font-weight: 600;
}

.mobile-item .expand-icon {
  opacity: 0.5;
  transition: all 0.25s ease;
}

.mobile-item.expanded {
  color: var(--md-c-brand);
  background: var(--md-c-bg-soft);
}

.mobile-item.expanded .expand-icon {
  transform: rotate(180deg);
  opacity: 1;
}

.mobile-expandable {
  width: 100%;
}

.mobile-categories {
  padding: 8px 0 0 12px;
  margin-left: 8px;
  border-left: 2px solid var(--md-c-divider-light);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-sub-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  min-height: 44px;
  margin: 4px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-c-text-2);
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.mobile-sub-item:hover,
.mobile-sub-item:active {
  background: var(--md-c-brand-soft);
  color: var(--md-c-brand);
}

.mobile-sub-item .category-title {
  flex: 1;
}

.mobile-sub-item .category-arrow {
  opacity: 0.5;
  transition: all 0.2s;
}

.mobile-sub-item:hover .category-arrow,
.mobile-sub-item:active .category-arrow {
  opacity: 1;
  transform: translateX(2px);
}

@media (min-width: 960px) {
  .main-header {
    position: fixed;
  }

  .navbar-container {
    justify-content: start;
  }

  .content {
    justify-content: space-between;
  }

  .text {
    font-size: 16px;
  }

  .navbar-item {
    font-size: 13px;
  }

  .navbar {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .hamburger-btn {
    display: none;
  }

  .mobile-dropdown {
    display: none !important;
  }

  .search {
    width: auto;
    min-width: 178px;
    height: 40px;
    min-height: 40px;
    justify-content: flex-start;
    padding: 0 10px 0 12px;
    background: var(--md-c-bg-soft);
  }

  .search-title {
    display: inline-block;
  }

  .search-shortcut {
    display: inline-block;
  }

  .theme-switch {
    display: flex;
  }
}

/* Mobile Theme Section */
.mobile-theme-section,
.mobile-explorer-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-top: 16px;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 8px;
  min-height: 56px;
  text-decoration: none;
}

.mobile-theme-label,
.mobile-explorer-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-1);
}

.mobile-explorer-section:hover {
  background: var(--md-c-bg-mute);
}

.mobile-explorer-section:hover .mobile-explorer-title {
  color: var(--md-c-brand);
}

.mobile-theme-switch {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.mobile-switch-track {
  position: relative;
  width: 50px;
  height: 28px;
  border-radius: 14px;
  background: var(--md-c-bg-mute);
  border: 1px solid var(--md-c-divider);
  transition: all 0.25s;
}

.mobile-switch-track:hover {
  border: 1px solid var(--md-c-gray);
}

.mobile-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  background: var(--md-c-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s;
  color: var(--md-c-text-2);
}

.mobile-switch-track.dark .mobile-switch-thumb {
  transform: translateX(22px);
  background: var(--md-c-bg);
}

.mobile-switch-thumb svg {
  width: 14px;
  height: 14px;
}
</style>
