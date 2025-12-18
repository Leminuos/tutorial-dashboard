<script setup>
import { RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'
import { ref } from 'vue';

const docs = useDocsStore()
const isDropdown = ref(0)

function onToggleDropdown()
{
  isDropdown.value = !isDropdown.value
}

</script>

<template>
  <header id="header" class="main-header">
    <div class="navbar-container">
      <router-link to="/" class="icon-link">
        <img src="/favicon.ico" width="36" height="36">
        <span class="text">Tutorial dashboard</span>
      </router-link>
      <div class="content">
        <div class="search">
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
        </div>
        <div class="navbar">
          <div class="navbar-item" v-for="(doc, index) in docs.tree.docs" :key="index">
            <router-link :to="`/docs/${doc.id}`">
              <span>{{ doc.title.toUpperCase() }}</span>
            </router-link>
          </div>
        </div>
        <div class="hamburger-btn" @click="onToggleDropdown">
          <span class="hamburger-container">
            <span class="hamburger-top"></span>
            <span class="hamburger-middle"></span>
            <span class="hamburger-bottom"></span>
          </span>
        </div>
      </div>
    </div>

    <div class="dropdown-screen" :class="{ active: isDropdown }" @click="onToggleDropdown">
      <div class="dropdown-container">
        <div class="dropdown-item" v-for="(doc, index) in docs.tree.docs" :key="index">
          <router-link :to="`/docs/${doc.id}`">
            <span>{{ doc.title }}</span>
          </router-link>
        </div>
      </div>
    </div>

  </header>
</template>

<style scoped>
.main-header {
  position: relative;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1000;
  height: var(--md-nav-height);
  background-color: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  transition: 0.5s ease-out;
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
  color: var(--md-c-text-light-1);
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
  color: var(--md-c-text-light-1);
  font-size: 11px;
  font-weight: 500;
  transition: color .25s;
  white-space: nowrap;
  line-height: var(--md-nav-height);
}

.navbar-item:hover {
  color: rgba(60, 60, 60, 0.7);
}

.search {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  height: var(--md-nav-height);
  color: var(--md-c-text-light-2);
  font-size: 14px;
}

.search:hover {
  color: var(--md-c-text-light-1);
}

.search-title {
  display: none;
}

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
  background-color: var(--md-c-text-light-1);
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

.dropdown-screen {
  position: fixed;
  top: calc(var(--md-nav-height) + 20px);
  bottom: 0;
  right: 0;
  left: 0;
  width: 100%;
  z-index: 999;
  overflow-y: auto;
  display: none;
}

.dropdown-screen.active {
  display: block;
}

.dropdown-container {
  margin: 0 auto;
  padding: 24px 32px 96px 32px;
  max-width: 288px;
  border-radius: 8px;
  border: 1px solid var(--md-c-divider-light-1);
  background-color: var(--md-c-white);
  box-shadow: var(--md-shadow-3);
}

.dropdown-item {
  border-bottom: 1px solid var(--md-c-divider-light-1);
  height: 40px;
  overflow: hidden;
  font-weight: 600;
  transition: border-color .5s;
  color: var(--md-c-text-light-1);
}

.dropdown-item:hover {
  color: var(--md-c-text-light-2);
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
    gap: 10px;
  }

  .hamburger-btn {
    display: none;
  }

  .dropdown-screen {
    display: none;
  }

  .search-title {
    display: inline-block;
  }
}

</style>
