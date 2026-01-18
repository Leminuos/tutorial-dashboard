<script setup>
import { ref, nextTick, onMounted, computed } from 'vue'
import { geminiService } from '@/service/gemini/geminiService'
import { useDocsStore } from '@/stores/docstree'

// State
const isOpen = ref(false)
const isLoading = ref(false)
const userInput = ref('')
const messages = ref([])
const messagesContainer = ref(null)

const docsStore = useDocsStore()

// Build docs context for AI
const docsContext = computed(() => {
  const docs = docsStore.tree?.docs || []
  if (docs.length === 0) return ''

  let context = '\n\n📚 **Thông tin về các tutorials trên website:**\n'

  for (const doc of docs) {
    if (doc.layout === 'tutorial') {
      context += `\n**${doc.title}** (Tutorial):\n`
      for (const chapter of doc.chapters || []) {
        context += `  - Chương: ${chapter.title}\n`
        for (const page of chapter.pages?.slice(0, 3) || []) {
          context += `    • ${page.title}\n`
        }
        if (chapter.pages?.length > 3) {
          context += `    • ... và ${chapter.pages.length - 3} bài khác\n`
        }
      }
    } else if (doc.layout === 'folder') {
      context += `\n**${doc.title}** (Tài liệu):\n`
      const folders = doc.children?.filter(c => c.type === 'folder').slice(0, 5) || []
      for (const folder of folders) {
        context += `  - ${folder.title}\n`
      }
    } else if (doc.layout === 'posts') {
      context += `\n**${doc.title}** (Bài viết/Blog):\n`
      context += `  - Chứa các bài viết và hướng dẫn\n`
    }
  }

  return context
})

// Check if AI is available (API key configured)
const isAiAvailable = computed(() => geminiService.isConfigured())

// Welcome message
onMounted(() => {
  if (isAiAvailable.value) {
    messages.value.push({
      role: 'bot',
      content: 'Xin chào! 👋 Tôi là trợ lý AI của Tutorial Dashboard. Tôi có thể giúp gì cho bạn?'
    })
  } else {
    messages.value.push({
      role: 'bot',
      content: '⚠️ **Tính năng AI chưa được kích hoạt**\n\nHiện tại website chưa cấu hình AI Assistant. Tính năng này sẽ sớm được hỗ trợ trong tương lai.\n\nBạn vẫn có thể duyệt các tutorials và tài liệu trên website!',
      isWarning: true
    })
  }
})

// Toggle chat dialog
function toggleChat() {
  isOpen.value = !isOpen.value
}

// Send message
async function sendMessage() {
  const message = userInput.value.trim()
  if (!message || isLoading.value) return

  // Check if AI is available
  if (!isAiAvailable.value) {
    messages.value.push({
      role: 'user',
      content: message
    })
    userInput.value = ''
    await scrollToBottom()

    messages.value.push({
      role: 'bot',
      content: '⚠️ Xin lỗi, tính năng AI hiện chưa được kích hoạt trên website này.',
      isWarning: true
    })
    await scrollToBottom()
    return
  }

  // Add user message
  messages.value.push({
    role: 'user',
    content: message
  })
  userInput.value = ''

  await scrollToBottom()

  // Inject docs context into the first message or when asking about content
  const needsContext = messages.value.filter(m => m.role === 'user').length <= 2 ||
    message.toLowerCase().includes('tutorial') ||
    message.toLowerCase().includes('bài') ||
    message.toLowerCase().includes('hướng dẫn') ||
    message.toLowerCase().includes('có gì') ||
    message.toLowerCase().includes('nội dung')

  const messageWithContext = needsContext && docsContext.value
    ? message + docsContext.value
    : message

  // Get AI response
  isLoading.value = true
  try {
    const response = await geminiService.sendMessage(messageWithContext)
    messages.value.push({
      role: 'bot',
      content: response
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    const errorMessage = error.message === 'API_KEY_NOT_CONFIGURED'
      ? '⚠️ Tính năng AI chưa được kích hoạt trên website này.'
      : '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.'
    messages.value.push({
      role: 'bot',
      content: errorMessage,
      isError: error.message !== 'API_KEY_NOT_CONFIGURED',
      isWarning: error.message === 'API_KEY_NOT_CONFIGURED'
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

// Handle Enter key
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// Scroll to bottom of messages
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Clear chat history
function clearChat() {
  geminiService.clearHistory()
  if (isAiAvailable.value) {
    messages.value = [{
      role: 'bot',
      content: 'Xin chào! 👋 Tôi là trợ lý AI của Tutorial Dashboard. Tôi có thể giúp gì cho bạn?'
    }]
  } else {
    messages.value = [{
      role: 'bot',
      content: '⚠️ **Tính năng AI chưa được kích hoạt**\n\nHiện tại website chưa cấu hình AI Assistant. Tính năng này sẽ sớm được hỗ trợ trong tương lai.\n\nBạn vẫn có thể duyệt các tutorials và tài liệu trên website!',
      isWarning: true
    }]
  }
}

// Simple markdown to HTML converter
function renderMarkdown(text) {
  if (!text) return ''

  return text
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <div class="ai-chatbot">
    <!-- Floating Button -->
    <button
      class="chat-toggle"
      :class="{ 'is-open': isOpen }"
      @click="toggleChat"
      aria-label="Toggle AI Chat"
    >
      <svg v-if="!isOpen" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Chat Dialog -->
    <Transition name="chat-slide">
      <div v-if="isOpen" class="chat-dialog">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-info">
            <div class="bot-avatar">🤖</div>
            <div class="bot-details">
              <span class="bot-name">AI Assistant</span>
              <span class="bot-status">Powered by Gemini</span>
            </div>
          </div>
          <button class="clear-btn" @click="clearChat" title="Xóa lịch sử">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="chat-messages">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message"
            :class="[msg.role, { 'error': msg.isError, 'warning': msg.isWarning }]"
          >
            <div class="message-avatar" v-if="msg.role === 'bot'">🤖</div>
            <div
              class="message-content"
              v-html="msg.role === 'bot' ? renderMarkdown(msg.content) : msg.content"
            ></div>
          </div>

          <!-- Loading indicator -->
          <div v-if="isLoading" class="message bot loading">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input">
          <textarea
            v-model="userInput"
            @keydown="handleKeydown"
            placeholder="Nhập câu hỏi của bạn..."
            rows="1"
            :disabled="isLoading"
          ></textarea>
          <button
            class="send-btn"
            @click="sendMessage"
            :disabled="!userInput.trim() || isLoading"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ai-chatbot {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: inherit;
}

/* Floating Toggle Button */
.chat-toggle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.chat-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.chat-toggle.is-open {
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
}

/* Chat Dialog */
.chat-dialog {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 380px;
  height: 520px;
  background: var(--md-c-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--md-c-divider-light, #e5e5e5);
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bot-avatar {
  font-size: 28px;
}

.bot-details {
  display: flex;
  flex-direction: column;
}

.bot-name {
  font-weight: 700;
  font-size: 16px;
}

.bot-status {
  font-size: 12px;
  opacity: 0.8;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Messages Container */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--md-c-bg-soft, #f9f9f9);
}

/* Message Bubbles */
.message {
  display: flex;
  gap: 8px;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.bot {
  align-self: flex-start;
}

.message-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.bot .message-content {
  background: var(--md-c-bg, white);
  color: var(--md-c-text-1, #333);
  border: 1px solid var(--md-c-divider-light, #e5e5e5);
  border-bottom-left-radius: 4px;
}

.message.error .message-content {
  background: #fee;
  border-color: #fcc;
  color: #c00;
}

.message.warning .message-content {
  background: #fff8e6;
  border-color: #ffe0a3;
  color: #996600;
}

/* Markdown styles in messages */
.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.message-content :deep(pre) {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.message-content :deep(strong) {
  font-weight: 700;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--md-c-text-3, #999);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Input Area */
.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--md-c-divider-light, #e5e5e5);
  background: var(--md-c-bg, white);
}

.chat-input textarea {
  flex: 1;
  border: 1px solid var(--md-c-divider-light, #e5e5e5);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  resize: none;
  outline: none;
  background: var(--md-c-bg-soft, #f9f9f9);
  color: var(--md-c-text-1, #333);
  font-family: inherit;
  max-height: 100px;
}

.chat-input textarea:focus {
  border-color: #667eea;
}

.chat-input textarea:disabled {
  opacity: 0.6;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transition */
.chat-slide-enter-active,
.chat-slide-leave-active {
  transition: all 0.3s ease;
}

.chat-slide-enter-from,
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .ai-chatbot {
    bottom: 16px;
    right: 16px;
  }

  .chat-dialog {
    position: fixed;
    bottom: 80px;
    right: 16px;
    left: 16px;
    width: auto;
    height: 400px;
    max-height: 60vh;
    border-radius: 16px;
  }

  .chat-toggle {
    width: 50px;
    height: 50px;
    z-index: 10001;
  }

  .chat-header {
    padding: 12px 16px;
  }

  .bot-avatar {
    font-size: 22px;
  }

  .bot-name {
    font-size: 14px;
  }

  .chat-messages {
    padding: 12px;
  }

  .chat-input {
    padding: 10px 12px;
  }

  .chat-input textarea {
    padding: 8px 12px;
    font-size: 13px;
  }

  .send-btn {
    width: 38px;
    height: 38px;
  }
}
</style>
