<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { buildRawUrl } from '@/stores/docstree'
import * as XLSX from 'xlsx'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const loading = ref(true)
const error = ref(null)
const workbook = ref(null)
const sheets = ref([])
const activeSheet = ref(0)
const tableData = ref([])

async function loadExcel() {
  loading.value = true
  error.value = null

  try {
    const url = buildRawUrl(props.path)
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Failed to load file: ${res.status}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    workbook.value = XLSX.read(arrayBuffer, { type: 'array' })

    sheets.value = workbook.value.SheetNames
    activeSheet.value = 0

    loadSheetData(0)
  } catch (err) {
    error.value = err.message
    console.error('Failed to load Excel:', err)
  } finally {
    loading.value = false
  }
}

function loadSheetData(index) {
  if (!workbook.value) return

  const sheetName = sheets.value[index]
  const worksheet = workbook.value.Sheets[sheetName]

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  tableData.value = data
}

function switchSheet(index) {
  activeSheet.value = index
  loadSheetData(index)
}

// Generate Excel-style column headers (A, B, C... AA, AB...)
function getColHeader(index) {
  let label = ''
  let i = index
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label
    i = Math.floor(i / 26) - 1
  }
  return label
}

const maxCols = computed(() => {
  if (!tableData.value.length) return 0
  return Math.max(...tableData.value.map(row => row.length))
})

onMounted(loadExcel)
watch(() => props.path, loadExcel)
</script>

<template>
  <div class="excel-viewer">
    <!-- Excel Toolbar/Header -->
    <div class="excel-header">
      <div class="title-bar">
        <span class="file-icon">📊</span>
        <span class="file-name">{{ fileName || 'Workbook.xlsx' }}</span>
        <span class="app-name">- Excel</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div> Loading Workbook...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else>
      <!-- Table Area -->
      <div class="table-area">
        <div class="table-container">
          <table class="excel-table">
            <thead>
              <tr>
                <!-- Corner Header -->
                <th class="row-header-col">◢</th>
                <!-- Column Headers -->
                <th v-for="i in maxCols" :key="i" class="col-header">
                  {{ getColHeader(i - 1) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in tableData" :key="rowIndex">
                <!-- Row Number -->
                <td class="row-header">{{ rowIndex + 1 }}</td>
                <!-- Data Cells -->
                <td
                  v-for="(ctx, colIndex) in maxCols"
                  :key="colIndex"
                  :class="{ 'empty-cell': !row[colIndex] }"
                >
                  {{ row[colIndex] || '' }}
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!tableData.length" class="empty">
            Empty Sheet
          </div>
        </div>
      </div>

      <!-- Sheet Tabs (Bottom) -->
      <div class="sheet-bar" v-if="sheets.length > 0">
        <div class="sheet-nav">
          <button class="nav-btn">◀</button>
          <button class="nav-btn">▶</button>
        </div>
        <div class="sheets-list">
          <button
            v-for="(sheet, index) in sheets"
            :key="sheet"
            :class="['sheet-tab', { active: activeSheet === index }]"
            @click="switchSheet(index)"
          >
            {{ sheet }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.excel-viewer {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  overflow: hidden;
  font-family: 'Segoe UI', sans-serif;
  color: #000;
}

/* Header mimicking Excel Green Title Bar */
.excel-header {
  background: #217346;
  color: white;
  padding: 8px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-name {
  opacity: 0.8;
  font-weight: 400;
}

/* Table Area */
.table-area {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #e6e6e6; /* Grid gap color */
}

.table-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: white;
}

.excel-table {
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
}

.excel-table th,
.excel-table td {
  border-right: 1px solid #e1e1e1;
  border-bottom: 1px solid #e1e1e1;
  padding: 4px 8px;
  font-size: 13px;
  white-space: nowrap;
}

/* Headers */
.col-header,
.row-header,
.row-header-col {
  background: #f8f9fa;
  color: #666;
  font-weight: 600;
  text-align: center;
  position: sticky;
  z-index: 10;
  user-select: none;
}

/* Column Headers (A, B, C...) */
.col-header {
  top: 0;
  border-bottom: 2px solid #ccc;
  min-width: 80px;
}

/* Corner Cell */
.row-header-col {
  top: 0;
  left: 0;
  z-index: 20; /* Higher than headers */
  border-bottom: 2px solid #ccc;
  background: #f8f9fa;
  color: #ccc;
  width: 40px;
  min-width: 40px;
}

/* Row Headers (1, 2, 3...) */
.row-header {
  left: 0;
  position: sticky;
  background: #f8f9fa;
  border-right: 2px solid #ccc;
  min-width: 40px;
  text-align: center;
}

/* Data Cells */
.excel-table td:not(.row-header) {
  background: white;
  color: #333;
  cursor: cell;
}

.excel-table td:hover:not(.row-header) {
  background: #f0f0f0;
}

/* Bottom Sheet Bar */
.sheet-bar {
  display: flex;
  align-items: center;
  background: #f3f3f3;
  border-top: 1px solid #d1d5db;
  height: 32px;
  padding: 0 4px;
}

.sheet-nav {
  display: flex;
  gap: 2px;
  margin-right: 12px;
}

.nav-btn {
  border: none;
  background: transparent;
  color: #666;
  font-size: 10px;
  cursor: pointer;
  padding: 4px;
}

.sheets-list {
  display: flex;
  height: 100%;
  overflow-x: auto;
}

.sheet-tab {
  height: 100%;
  padding: 0 20px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #444;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-right: 1px solid #e0e0e0;
  position: relative;
}

.sheet-tab:hover {
  background: #eaeaea;
}

.sheet-tab.active {
  background: white;
  color: #217346;
  font-weight: 600;
  border-bottom: 2px solid #217346;
}

.loading, .error {
  padding: 40px;
  text-align: center;
  color: #666;
}

.empty {
  padding: 24px;
  text-align: center;
  color: #999;
}
</style>
