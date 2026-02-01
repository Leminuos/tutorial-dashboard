<script setup>
import { computed } from 'vue'
import { useDocsStore } from '@/stores/docstree'
import { useSearchStore } from '@/stores/searchStore'

const docs = useDocsStore()
const searchStore = useSearchStore()

// All docs combined (tutorial docs + posts categories flattened)
const allDocs = computed(() => {
  const items = []

  // Add tutorial docs as-is
  for (const doc of docs.tutorialDocs) {
    items.push({
      ...doc,
      type: 'tutorial'
    })
  }

  // Flatten posts docs into individual categories
  for (const doc of docs.postDocs) {
    const categories = doc.children?.filter(c => c.type === 'folder') || []
    for (const category of categories) {
      items.push({
        id: `${doc.id}/${category.id}`,
        title: category.title,
        type: 'category',
        sectionId: doc.id,
        sectionTitle: doc.title,
        children: category.children
      })
    }
  }

  return items
})

// Get page count for a doc item
function getPageCount(item) {
  if (item.type === 'tutorial') {
    let count = 0
    for (const chapter of item.chapters || []) {
      count += chapter.pages?.length || 0
    }
    return count
  } else if (item.type === 'category') {
    // Count subcategories or files in this category
    return item.children?.filter(c => c.type === 'folder').length || 0
  }
  return 0
}


// Get link for a doc item
function getDocLink(item) {
  if (item.type === 'tutorial') {
    const chapter = item.chapters?.[0]
    const page = chapter?.pages?.[0]
    if (chapter && page) {
      return `/docs/${item.id}/${chapter.id}/${page.id}`
    }
    return `/docs/${item.id}`
  } else if (item.type === 'category') {
    return `/posts/${item.id}`
  }
  return '/'
}

// Get count label
function getCountLabel(item) {
  if (item.type === 'tutorial') {
    return 'trang'
  }
  return 'chủ đề'
}

function openSearch() {
  searchStore.open()
}

</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">Tutorial Dashboard</span>
        </h1>
        <p class="hero-tagline">
          Nơi chia sẻ kiến thức về hệ thống nhúng. Khám phá các hướng dẫn về
          Linux kernel, vi điều khiển, device driver và các dự án thực tế.
        </p>
        <div class="hero-actions">
          <router-link
            v-if="allDocs.length"
            :to="getDocLink(allDocs[0])"
            class="btn btn-primary"
          >
            🚀 Bắt đầu
          </router-link>
          <button class="btn btn-secondary" @click="openSearch">
            🔍 Tìm kiếm
          </button>
        </div>
      </div>
    </section>

    <!-- Documentation Cards -->
    <section class="docs-section">
      <h2 class="section-title">Tài liệu</h2>
      <div class="docs-grid">
        <router-link
          v-for="doc in allDocs"
          :key="doc.id"
          :to="getDocLink(doc)"
          class="doc-card"
        >
          <h3 class="doc-title">{{ doc.title }}</h3>
          <p class="doc-count">
            {{ getPageCount(doc) }} {{ getCountLabel(doc) }}
          </p>
          <div class="doc-arrow">→</div>
        </router-link>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <h2 class="section-title">Tính năng</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">📝</div>
          <h3>Tài liệu phong phú</h3>
          <p>Hướng dẫn có cấu trúc rõ ràng kèm ví dụ code và giải thích chi tiết</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💻</div>
          <h3>Ví dụ code</h3>
          <p>Code được highlight cú pháp, hỗ trợ nhiều ngôn ngữ lập trình</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📄</div>
          <h3>Xem tài liệu</h3>
          <p>Xem PDF, Excel và nhiều loại file khác ngay trong trình duyệt</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔍</div>
          <h3>Tìm kiếm nhanh</h3>
          <p>Tìm nội dung bạn cần ngay lập tức với phím tắt Ctrl+K</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  min-height: calc(100vh - var(--md-nav-height));
}

/* Hero Section */
.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 60px 24px;
  background: var(--md-c-bg-soft);
}

.hero-content {
  text-align: center;
  max-width: 700px;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 20px;
  line-height: 1.2;
}

.gradient-text {
  background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  font-size: 18px;
  color: var(--md-c-text-2);
  line-height: 1.6;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--md-c-brand);
  color: white;
}

.btn-primary:hover {
  background: #3aa876;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(66, 184, 131, 0.3);
}

.btn-secondary {
  background: var(--md-c-bg);
  color: var(--md-c-text-1);
  border: 1px solid var(--md-c-divider-light);
}

.btn-secondary:hover {
  border-color: var(--md-c-brand);
  color: var(--md-c-brand);
}

/* Sections */
.docs-section,
.features-section {
  padding: 60px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  color: var(--md-c-text-1);
}

/* Docs Grid */
.docs-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.doc-card {
  position: relative;
  padding: 28px;
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
  border-radius: 16px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.doc-card:hover {
  border-color: var(--md-c-brand);
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.doc-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.doc-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--md-c-text-1);
  margin-bottom: 8px;
}

.doc-count {
  font-size: 14px;
  color: var(--md-c-text-2);
}

.doc-arrow {
  position: absolute;
  top: 28px;
  right: 28px;
  font-size: 20px;
  color: var(--md-c-divider-light);
  transition: all 0.3s;
}

.doc-card:hover .doc-arrow {
  color: var(--md-c-brand);
  transform: translateX(4px);
}

/* Features Grid */
.features-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.feature-card {
  padding: 24px;
  background: var(--md-c-bg-soft);
  border-radius: 12px;
  text-align: center;
}

.feature-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--md-c-text-1);
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 14px;
  color: var(--md-c-text-2);
  line-height: 1.5;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-tagline {
    font-size: 16px;
  }

  .btn {
    padding: 12px 20px;
    font-size: 14px;
  }

  .section-title {
    font-size: 24px;
  }
}
</style>
