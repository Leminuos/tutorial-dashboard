<script setup>
import { ref, watch, onMounted } from 'vue'
import { buildRawUrl } from '@/stores/docstree'
import * as XLSX from 'xlsx'

const props = defineProps({
  path: { type: String, required: true },
  fileName: { type: String, default: '' }
})

const loading = ref(true)
const error = ref(null)
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
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    sheets.value = workbook.SheetNames
    activeSheet.value = 0

    loadSheetData(workbook, 0)
  } catch (err) {
    error.value = err.message
    console.error('Failed to load Excel:', err)
  } finally {
    loading.value = false
  }
}

function loadSheetData(workbook, index) {
  const sheetName = sheets.value[index]
  const worksheet = workbook.Sheets[sheetName]

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  tableData.value = data
}

function switchSheet(index) {
  activeSheet.value = index
  // Reload the Excel to get sheet data
  loadExcel()
}

onMounted(loadExcel)
watch(() => props.path, loadExcel)
</script>

<template>
  <div class="excel-viewer">
    <div class="excel-header">
      <span class="file-icon">📊</span>
      <span class="file-name">{{ fileName || 'Excel File' }}</span>
    </div>

    <div v-if="loading" class="loading">
      Loading Excel...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else>
      <!-- Sheet tabs -->
      <div class="sheet-tabs" v-if="sheets.length > 1">
        <button
          v-for="(sheet, index) in sheets"
          :key="sheet"
          :class="['sheet-tab', { active: activeSheet === index }]"
          @click="switchSheet(index)"
        >
          {{ sheet }}
        </button>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="excel-table">
          <thead v-if="tableData.length">
            <tr>
              <th v-for="(cell, i) in tableData[0]" :key="i">
                {{ cell }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in tableData.slice(1)" :key="rowIndex">
              <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!tableData.length" class="empty">
          No data in this sheet
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.excel-viewer {
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 8px;
  overflow: hidden;
  background: var(--md-c-white);
}

.excel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  font-size: 13px;
  font-weight: 500;
  color: var(--md-c-text-light-1);
}

.file-icon {
  font-size: 14px;
}

.loading,
.error,
.empty {
  padding: 24px;
  text-align: center;
  color: var(--md-c-text-light-2);
}

.error {
  color: #e53935;
}

.sheet-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: var(--md-c-white-soft);
  border-bottom: 1px solid var(--md-c-divider-light-2);
  overflow-x: auto;
}

.sheet-tab {
  padding: 6px 12px;
  border: 1px solid var(--md-c-divider-light-2);
  border-radius: 4px;
  background: var(--md-c-white);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.sheet-tab:hover {
  background: var(--md-c-divider-light-1);
}

.sheet-tab.active {
  background: var(--md-c-green);
  color: white;
  border-color: var(--md-c-green);
}

.table-container {
  overflow-x: auto;
  max-height: 60vh;
  overflow-y: auto;
}

.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.excel-table th,
.excel-table td {
  padding: 8px 12px;
  border: 1px solid var(--md-c-divider-light-2);
  text-align: left;
  white-space: nowrap;
}

.excel-table th {
  background: var(--md-c-white-soft);
  font-weight: 600;
  color: var(--md-c-text-light-1);
  position: sticky;
  top: 0;
}

.excel-table td {
  color: var(--md-c-text-light-2);
}

.excel-table tr:hover td {
  background: var(--md-c-white-soft);
}
</style>
