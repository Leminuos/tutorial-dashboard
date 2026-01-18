import config from '@/config/gemini.config.js'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Gemini AI Service
 * Handles communication with Google Gemini API
 */
class GeminiService {
  constructor() {
    this.apiKey = config.gemini.apiKey
    this.model = config.gemini.model
    this.systemPrompt = config.gemini.systemPrompt
    this.conversationHistory = []
  }

  /**
   * Check if API key is configured
   */
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0)
  }

  /**
   * Send a message to Gemini and get a response
   * @param {string} userMessage - The user's message
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(userMessage) {
    // Check if API key is configured
    if (!this.isConfigured()) {
      throw new Error('API_KEY_NOT_CONFIGURED')
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    })

    try {
      // Build contents with system prompt as first context
      const contents = [
        {
          role: 'user',
          parts: [{ text: this.systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'Tôi hiểu. Tôi sẽ hỗ trợ người dùng theo hướng dẫn.' }]
        },
        ...this.conversationHistory
      ]

      const response = await fetch(
        `${API_URL}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'API request failed')
      }

      const data = await response.json()
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Xin lỗi, tôi không thể trả lời lúc này.'

      // Add AI response to history
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
      })

      return aiResponse
    } catch (error) {
      console.error('Gemini API Error:', error)
      // Remove the failed user message from history
      this.conversationHistory.pop()
      throw error
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = []
  }

  /**
   * Get current conversation history
   */
  getHistory() {
    return this.conversationHistory
  }
}

// Export singleton instance
export const geminiService = new GeminiService()
