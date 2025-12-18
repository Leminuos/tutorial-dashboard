<script setup>
import { RouterLink } from 'vue-router'
import { useDocsStore } from '@/stores/docstree'

const docs = useDocsStore()
</script>

<template>
  <header id="header" class="main-header">
    <div class="container">
      <router-link to="/" class="icon-link">
        <img src="/favicon.ico" width="36" height="36">
        <span class="text">Tutorial dashboard</span>
      </router-link>
      <div class="content">
        <div class="search"></div>
        <div class="navbar">
          <div class="navbar-item" v-for="(doc, index) in docs.tree.docs" :key="index">
            <router-link :to="`/docs/${doc.id}`">
              <span>{{ doc.title.toUpperCase() }}</span>
            </router-link>
          </div>
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
  z-index: 900;
  height: var(--md-nav-height);
  background-color: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  transition: 0.5s ease-out;
}

@media (min-width: 960px) {
  .main-header {
    position: fixed;
  }
}

.container {
  display: flex;
  justify-content: start;
  align-items: center;
  padding: 0 15px;
  gap: 20px;
}

@media (min-width: 1280px) {
  .container {
    padding: 0 32px;
  }
}

@media (min-width: 1440px) {
  .container {
    padding: 0 100px;
  }
}

@media (min-width: 1600px) {
  .container {
    padding: 0 150px;
  }
}

@media (min-width: 1920px) {
  .container {
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
  justify-content: space-between;
  align-items: center;
}

.navbar {
  display: flex;
  gap: 10px;
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

@media (min-width: 960px) {
  .text {
    font-size: 16px;
  }

  .navbar-item {
    font-size: 13px;
  }
}

</style>
