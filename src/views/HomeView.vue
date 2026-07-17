<script setup>
import { computed } from 'vue'
import { useDocsStore } from '@/stores/docstree'
import { useSearchStore } from '@/stores/searchStore'

const docs = useDocsStore()
const searchStore = useSearchStore()

const sections = computed(() => docs.tree?.docs || [])

const sectionItems = computed(() => sections.value.flatMap(section => {
  if (section.layout !== 'posts') {
    return [{
      ...section,
      count: countSectionItems(section),
      href: getSectionLink(section),
      label: getLayoutLabel(section.layout),
      sourceTitle: null
    }]
  }

  return (section.children || [])
    .filter(category => category.type === 'folder')
    .map(category => ({
      ...category,
      itemKey: `${section.id}/${category.id}`,
      layout: 'posts',
      count: category.children?.filter(child => child.type === 'folder').length || 0,
      href: `/posts/${section.id}/${category.id}`,
      label: getLayoutLabel('posts'),
      sourceTitle: section.title
    }))
}))

const stats = computed(() => ({
  sections: sections.value.length,
  tutorials: docs.tutorialDocs.reduce((total, section) => total + countSectionItems(section), 0),
  resources: docs.folderDocs.reduce((total, section) => total + countFiles(section), 0),
  topics: docs.postDocs.reduce((total, section) => total + countTopLevelFolders(section), 0)
}))

function countSectionItems(section) {
  if (section.layout === 'tutorial') {
    return (section.chapters || []).reduce((total, chapter) => total + (chapter.pages?.length || 0), 0)
  }

  if (section.layout === 'posts') return countTopLevelFolders(section)
  return countFiles(section)
}

function countFiles(node) {
  return (node.children || []).reduce((total, child) => {
    return total + (child.type === 'folder' ? countFiles(child) : 1)
  }, 0)
}

function countTopLevelFolders(section) {
  return section.children?.filter(child => child.type === 'folder').length || 0
}

function getSectionLink(section) {
  if (section.layout === 'tutorial') {
    const chapter = section.chapters?.[0]
    const page = chapter?.pages?.[0]
    return chapter && page
      ? `/docs/${section.id}/${chapter.id}/${page.id}`
      : `/docs/${section.id}`
  }

  if (section.layout === 'posts') {
    const category = section.children?.find(child => child.type === 'folder')
    return category ? `/posts/${section.id}/${category.id}` : `/posts/${section.id}`
  }

  return `/${section.id}`
}

function getLayoutLabel(layout) {
  if (layout === 'tutorial') return 'Hướng dẫn'
  if (layout === 'posts') return 'Chủ đề'
  return 'Tài nguyên'
}

function getCountLabel(layout) {
  if (layout === 'tutorial') return 'bài học'
  if (layout === 'posts') return 'chủ đề'
  return 'tệp'
}

function openSearch() {
  searchStore.open()
}
</script>

<template>
  <main class="home">
    <section class="intro" aria-labelledby="home-title">
      <div class="intro-inner">
        <div class="intro-copy">
          <p class="eyebrow">Thư viện kỹ thuật</p>
          <h1 id="home-title">Tài liệu để học, tra cứu và thực hành.</h1>
          <p class="intro-description">
            Tổng hợp hướng dẫn về hệ thống nhúng, Linux, vi điều khiển và phát triển phần mềm,
            được tổ chức trực tiếp từ kho tài liệu của dự án.
          </p>

          <div class="intro-actions">
            <button class="search-action" type="button" @click="openSearch">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.7-3.7" />
              </svg>
              <span>Tìm trong tài liệu</span>
              <kbd>Ctrl K</kbd>
            </button>
            <router-link to="/explorer" class="browse-action">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 7.5h6l2 2h10v9.5H3z" />
                <path d="M3 7.5V5h6l2 2h8v2.5" />
              </svg>
              Mở File Explorer
            </router-link>
          </div>
        </div>

        <dl class="stats" aria-label="Thống kê thư viện">
          <div>
            <dt>{{ stats.sections }}</dt>
            <dd>Khu vực</dd>
          </div>
          <div>
            <dt>{{ stats.tutorials }}</dt>
            <dd>Bài học</dd>
          </div>
          <div>
            <dt>{{ stats.resources + stats.topics }}</dt>
            <dd>Tài nguyên</dd>
          </div>
        </dl>
      </div>
    </section>

    <section class="library" aria-labelledby="library-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Nội dung</p>
          <h2 id="library-title">Khám phá thư viện</h2>
        </div>
        <router-link to="/explorer" class="explorer-link">
          Duyệt tất cả tệp
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </router-link>
      </div>

      <p v-if="docs.error" class="state-message" role="alert">
        Không thể tải thư viện lúc này. Vui lòng thử lại sau.
      </p>

      <div v-else-if="sectionItems.length" class="section-list">
        <router-link
          v-for="(section, index) in sectionItems"
          :key="section.itemKey || section.id"
          :to="section.href"
          class="section-row"
        >
          <span class="section-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="section-main">
            <span class="section-meta">
              {{ section.label }}
              <template v-if="section.sourceTitle"> · {{ section.sourceTitle }}</template>
            </span>
            <strong>{{ section.title }}</strong>
          </span>
          <span class="section-count">
            {{ section.count }} {{ getCountLabel(section.layout) }}
          </span>
          <svg class="row-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </router-link>
      </div>

      <p v-else class="state-message">Thư viện chưa có nội dung.</p>
    </section>

    <section class="workflow" aria-labelledby="workflow-title">
      <div class="workflow-intro">
        <p class="eyebrow">Cách sử dụng</p>
        <h2 id="workflow-title">Một nơi cho toàn bộ tài liệu dự án</h2>
        <p>
          Đọc theo lộ trình, tìm nhanh một khái niệm hoặc mở trực tiếp tệp kỹ thuật ngay trên trình duyệt.
        </p>
      </div>

      <div class="workflow-list">
        <article>
          <span class="workflow-number">01</span>
          <h3>Học theo chương</h3>
          <p>Theo dõi nội dung có thứ tự rõ ràng, từ kiến thức nền đến ví dụ thực hành.</p>
        </article>
        <article>
          <span class="workflow-number">02</span>
          <h3>Tra cứu tức thì</h3>
          <p>Tìm tiêu đề và nội dung trong toàn bộ thư viện bằng công cụ tìm kiếm chung.</p>
        </article>
        <article>
          <span class="workflow-number">03</span>
          <h3>Xem nhiều định dạng</h3>
          <p>Mở mã nguồn, PDF, bảng tính và tài liệu đính kèm mà không rời khỏi dashboard.</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  min-height: calc(100vh - var(--md-nav-height));
  color: var(--md-c-text-1);
}

.intro {
  border-bottom: 1px solid var(--md-c-divider-light);
}

.intro-inner,
.library,
.workflow {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}

.intro-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 72px;
  align-items: end;
  padding: 88px 0 72px;
}

.intro-copy {
  max-width: 760px;
}

.eyebrow {
  margin-bottom: 12px;
  color: var(--md-c-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  max-width: 720px;
  font-size: 52px;
  font-weight: 760;
  line-height: 1.08;
  letter-spacing: 0;
}

.intro-description {
  max-width: 680px;
  margin-top: 24px;
  color: var(--md-c-text-2);
  font-size: 18px;
  line-height: 1.7;
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 32px;
}

.browse-action,
.search-action,
.explorer-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition: color .2s, border-color .2s, background-color .2s, transform .2s;
}

.browse-action svg,
.explorer-link svg,
.row-arrow {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.search-action {
  gap: 10px;
  padding: 0 10px 0 14px;
  color: white;
  background: var(--md-c-brand);
  border: 1px solid var(--md-c-brand);
}

.search-action:hover {
  background: var(--md-c-brand-dark);
  border-color: var(--md-c-brand-dark);
}

.search-action svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.search-action kbd {
  padding: 3px 6px;
  color: rgba(255, 255, 255, .9);
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .28);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
}

.browse-action {
  gap: 8px;
  padding: 0 16px;
  color: var(--md-c-text-1);
  background: var(--md-c-bg);
  border: 1px solid var(--md-c-divider-light);
}

.browse-action:hover {
  color: var(--md-c-brand);
  border-color: color-mix(in srgb, var(--md-c-brand) 45%, var(--md-c-divider-light));
}

.stats {
  display: grid;
  gap: 18px;
  padding-left: 28px;
  border-left: 1px solid var(--md-c-divider-light);
}

.stats div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.stats dt {
  font-size: 28px;
  font-weight: 720;
  line-height: 1;
}

.stats dd {
  color: var(--md-c-text-2);
  font-size: 13px;
}

.library {
  padding: 72px 0 80px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

h2 {
  font-size: 30px;
  font-weight: 720;
  line-height: 1.2;
  letter-spacing: 0;
}

.explorer-link {
  gap: 5px;
  min-height: 36px;
  color: var(--md-c-text-2);
}

.explorer-link:hover {
  color: var(--md-c-brand);
}

.section-list {
  border-top: 1px solid var(--md-c-divider-light);
}

.section-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto 24px;
  gap: 18px;
  align-items: center;
  min-height: 96px;
  border-bottom: 1px solid var(--md-c-divider-light);
  transition: color .2s, background-color .2s;
}

.section-row:hover {
  color: var(--md-c-brand);
  background: color-mix(in srgb, var(--md-c-brand-soft) 48%, transparent);
}

.section-index,
.section-count {
  color: var(--md-c-text-2);
  font-size: 13px;
}

.section-main {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.section-meta {
  color: var(--md-c-brand);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.section-main strong {
  overflow: hidden;
  color: var(--md-c-text-1);
  font-size: 18px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-row:hover .section-main strong {
  color: var(--md-c-brand);
}

.row-arrow {
  color: var(--md-c-text-3);
  transition: color .2s, transform .2s;
}

.section-row:hover .row-arrow {
  color: var(--md-c-brand);
  transform: translateX(3px);
}

.state-message {
  padding: 28px 0;
  color: var(--md-c-text-2);
  border-top: 1px solid var(--md-c-divider-light);
  border-bottom: 1px solid var(--md-c-divider-light);
}

.workflow {
  display: grid;
  grid-template-columns: minmax(240px, .8fr) minmax(0, 1.6fr);
  gap: 80px;
  padding: 72px 0 96px;
  border-top: 1px solid var(--md-c-divider-light);
}

.workflow-intro p:last-child {
  margin-top: 18px;
  color: var(--md-c-text-2);
  font-size: 15px;
  line-height: 1.7;
}

.workflow-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.workflow-list article {
  padding-top: 15px;
  border-top: 2px solid var(--md-c-divider-light);
}

.workflow-number {
  color: var(--md-c-brand);
  font-size: 12px;
  font-weight: 700;
}

.workflow-list h3 {
  margin-top: 18px;
  font-size: 16px;
  font-weight: 680;
}

.workflow-list p {
  margin-top: 9px;
  color: var(--md-c-text-2);
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 800px) {
  .intro-inner {
    grid-template-columns: 1fr;
    gap: 42px;
    padding: 64px 0 52px;
  }

  h1 {
    font-size: 40px;
  }

  .stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    padding: 22px 0 0;
    border-top: 1px solid var(--md-c-divider-light);
    border-left: 0;
  }

  .stats div {
    display: grid;
    gap: 7px;
  }

  .workflow {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

@media (max-width: 600px) {
  .intro-inner,
  .library,
  .workflow {
    width: min(100% - 32px, 1120px);
  }

  .intro-inner {
    padding-top: 48px;
  }

  h1 {
    font-size: 34px;
  }

  .intro-description {
    margin-top: 18px;
    font-size: 16px;
  }

  .intro-actions {
    display: grid;
  }

  .browse-action,
  .search-action {
    width: 100%;
  }

  .search-action span {
    margin-right: auto;
  }

  .library {
    padding: 54px 0 64px;
  }

  .section-heading {
    display: grid;
    align-items: start;
    margin-bottom: 22px;
  }

  .explorer-link {
    justify-content: flex-start;
  }

  .section-row {
    grid-template-columns: 34px minmax(0, 1fr) 20px;
    gap: 12px;
    min-height: 86px;
  }

  .section-count {
    display: none;
  }

  .section-main strong {
    font-size: 16px;
  }

  .workflow {
    padding: 54px 0 72px;
  }

  .workflow-list {
    grid-template-columns: 1fr;
    gap: 26px;
  }
}
</style>
