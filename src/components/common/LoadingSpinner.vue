<template>
  <div class="loading-overlay">
    <div class="spinner-container">
      <div class="spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--md-c-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--md-c-divider-light);
  border-top-color: var(--md-c-brand);
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}

.loading-text {
  color: var(--md-c-text-2);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
</style>
