<script setup>
import { RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import { useSearchStore } from '@/stores/searchStore'
import { useThemeStore } from '@/stores/themeStore'
import { ref, computed, watch } from 'vue'
import SearchModal from '@/components/search/SearchModal.vue'

const docs = useDocsStore()
const searchStore = useSearchStore()
const themeStore = useThemeStore()
const isDropdownMobile = ref(false)
const activeDropdown = ref(null)
const expandedMobileSection = ref(null)

// Tutorial docs - show as direct links
const tutorialDocs = computed(() => docs.tutorialDocs)

// Folder docs - show with hover menu
const folderDocs = computed(() => docs.folderDocs)

// Disable body scroll when mobile dropdown is open
watch(isDropdownMobile, (isOpen) => {
  if (isOpen) {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
  } else {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
    document.body.style.position = ''
    document.body.style.width = ''
  }
})

function onToggleDropdown() {
  isDropdownMobile.value = !isDropdownMobile.value
  expandedMobileSection.value = null
}

function onMouseEnter(docId) {
  activeDropdown.value = docId
}

function onMouseLeave() {
  activeDropdown.value = null
}

function onToggleMobileSection(docId) {
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
        <button class="search" @click="openSearch">
          <div class="icon-search">
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
          </div>
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

          <!-- Folder docs - hover menus -->
          <div
            class="navbar-item dropdown-trigger"
            v-for="doc in folderDocs"
            :key="doc.id"
            @mouseenter="onMouseEnter(doc.id)"
            @mouseleave="onMouseLeave"
          >
            <router-link :to="`/docs/${doc.id}`" class="dropdown-label">
              {{ doc.title.toUpperCase() }}
              <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </router-link>

            <!-- Dropdown menu - show top-level folders -->
            <div
              class="dropdown-menu"
              v-show="activeDropdown === doc.id"
            >
              <router-link
                v-for="folder in doc.children?.filter(c => c.type === 'folder')"
                :key="folder.id"
                :to="`/docs/${doc.id}/${folder.id}`"
                class="dropdown-category-link"
                @click="onMouseLeave"
              >
                <span class="category-icon">📁</span>
                <span class="category-title">{{ folder.title }}</span>
              </router-link>
            </div>
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
        <div class="hamburger-btn" @click="onToggleDropdown">
          <span class="hamburger-container">
            <span class="hamburger-top"></span>
            <span class="hamburger-middle"></span>
            <span class="hamburger-bottom"></span>
          </span>
        </div>
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
            :to="`/docs/${doc.id}`"
            class="mobile-item"
            @click="onToggleDropdown"
          >
            <span>{{ doc.title }}</span>
          </router-link>

          <!-- Folder docs - expandable -->
          <div
            v-for="doc in folderDocs"
            :key="doc.id"
            class="mobile-expandable"
          >
            <button
              class="mobile-item expandable"
              :class="{ expanded: expandedMobileSection === doc.id }"
              @click="onToggleMobileSection(doc.id)"
            >
              <span>{{ doc.title }}</span>
              <svg class="expand-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <!-- Top-level folders inside folder doc -->
            <div
              class="mobile-categories"
              v-show="expandedMobileSection === doc.id"
            >
              <router-link
                v-for="folder in doc.children?.filter(c => c.type === 'folder')"
                :key="folder.id"
                :to="`/docs/${doc.id}/${folder.id}`"
                class="mobile-category-link"
                @click="onToggleDropdown"
              >
                <span class="category-icon">📁</span>
                <span>{{ folder.title }}</span>
              </router-link>
            </div>
          </div>
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
  position: relative;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1000;
  height: var(--md-nav-height);
  background-color: var(--md-c-bg-soft);
  border-bottom: 1px solid var(--md-c-divider-light);
  transition: 0.5s ease-out;
}

/* When mobile dropdown is active, header becomes fixed */
.main-header:has(.mobile-dropdown.active) {
  position: fixed;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  gap: 20px;
}

@media (min-width: 1280px) {
  .navbar-container {
    padding: 0 32px;
  }
}

@media (min-width: 1440px) {
  .navbar-container {
    padding: 0 100px;
  }
}

@media (min-width: 1600px) {
  .navbar-container {
    padding: 0 150px;
  }
}

@media (min-width: 1920px) {
  .navbar-container {
    padding: 0 200px;
  }
}

.icon-link {
  display: flex;
  align-items: center;
  transition: opacity .25s;
}

.icon-link:hover {
  opacity: 0.6;
}

.text {
  padding-left: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--md-c-text-1);
}

.content {
  display: flex;
  justify-content: end;
  align-items: center;
  flex-grow: 1;
  gap: 10px;
}

.navbar {
  display: none;
}

.navbar-item {
  position: relative;
  color: var(--md-c-text-1);
  font-size: 11px;
  font-weight: 500;
  transition: color .25s;
  white-space: nowrap;
  line-height: var(--md-nav-height);
}

.navbar-item:hover {
  color: var(--md-c-text-3);
}

/* Dropdown trigger */
.dropdown-trigger {
  cursor: pointer;
}

.dropdown-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dropdown-arrow {
  transition: transform 0.2s;
}

.dropdown-trigger:hover .dropdown-arrow {
  transform: rotate(180deg);
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 12px;
  z-index: 1001;
}

.dropdown-category-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--md-c-text-1);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.dropdown-category-link:hover {
  background: var(--md-c-brand);
  color: white;
}

.dropdown-category-link .category-icon {
  font-size: 16px;
}

.dropdown-category-link .category-title {
  font-weight: 500;
}

/* Search */
.search {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  height: var(--md-nav-height);
  padding: 0 12px;
  color: var(--md-c-text-2);
  font-size: 14px;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.search:hover {
  color: var(--md-c-text-1);
}

.search-title {
  display: none;
}

.search-shortcut {
  display: none;
  padding: 3px 6px;
  font-size: 11px;
  font-family: inherit;
  background: var(--md-c-bg-soft);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 4px;
  color: var(--md-c-text-2);
  transition: all 0.2s;
}

.search:hover .search-shortcut {
  border: 1px solid var(--md-c-brand);
  color: var(--md-c-brand);
}

/* Theme switch */
.theme-switch {
  display: none;
  align-items: center;
  margin-left: 8px;
  cursor: pointer;
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
  width: 40px;
  height: var(--md-nav-height);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: transparent;
}

.hamburger-container {
  position: relative;
  width: 16px;
  height: 14px;
  overflow: hidden;
}

.hamburger-top, .hamburger-middle, .hamburger-bottom {
  position: absolute;
  width: 16px;
  height: 2px;
  background-color: var(--md-c-text-1);
  transition: top .25s, background-color .5s, transform .25s;
}

.hamburger-top {
  top: 0;
  left: 0;
  transform: translate(0);
}

.hamburger-middle {
  top: 6px;
  left: 0;
  transform: translate(8px);
}

.hamburger-bottom {
  top: 12px;
  left: 0;
  transform: translate(4px);
}

.hamburger-btn:hover .hamburger-top {
  transform: translate(4px);
}

.hamburger-btn:hover .hamburger-middle {
  transform: translate(0px);
}

.hamburger-btn:hover .hamburger-bottom {
  transform: translate(8px);
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
  height: 100%;
  padding: 24px;
  background: var(--md-c-bg);
  overflow-y: auto;
}

.mobile-section {
  background: var(--md-c-bg);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.mobile-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
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
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.mobile-item:hover,
.mobile-item:active {
  background: var(--md-c-bg-soft);
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

.mobile-category-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin: 4px 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--md-c-text-2);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.mobile-category-link:hover,
.mobile-category-link:active {
  background: var(--md-c-brand);
  color: white;
}

.mobile-category-link .category-icon {
  font-size: 16px;
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
    gap: 20px;
  }

  .hamburger-btn {
    display: none;
  }

  .mobile-dropdown {
    display: none !important;
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
.mobile-theme-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-top: 16px;
  background: var(--md-c-bg-soft);
  border-radius: 12px;
}

.mobile-theme-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--md-c-text-1);
}

.mobile-theme-switch {
  cursor: pointer;
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
