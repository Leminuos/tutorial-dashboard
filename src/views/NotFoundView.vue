<script setup>
import { RouterLink } from 'vue-router'
import HeaderMain from '@/components/main/HeaderMain.vue'
</script>

<template>
  <HeaderMain />

  <div class="not-found-view">
    <div class="container">
      <div class="error-code">404</div>
      <h1 class="error-title">Trang không tồn tại</h1>
      <p class="error-description">
        Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>
      <RouterLink to="/" class="home-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Về trang chủ
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.not-found-view {
  min-height: calc(100vh - var(--md-nav-height));
  background-color: var(--md-c-bg);
  margin-top: var(--md-nav-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.container {
  text-align: center;
  max-width: 500px;
}

.error-code {
  font-size: 120px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, var(--md-c-brand) 0%, var(--md-c-brand-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin: 0 0 16px 0;
}

.error-description {
  font-size: 16px;
  color: var(--md-c-text-2);
  line-height: 1.6;
  margin: 0 0 32px 0;
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: var(--md-c-brand);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.2s;
}

.home-btn:hover {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .error-code {
    font-size: 80px;
  }

  .error-title {
    font-size: 22px;
  }

  .error-description {
    font-size: 14px;
  }
}
</style>
