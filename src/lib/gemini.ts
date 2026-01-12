if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file.')
}

const API_KEY = process.env.GEMINI_API_KEY
const API_URL = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message || ''
  const errorText = error?.toString() || ''

  // Check for common rate limit indicators
  return (
    errorMessage.includes('429') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorText.includes('429') ||
    errorText.includes('rate limit') ||
    errorText.includes('quota')
  )
}

export async function generateVerdict(prompt: string): Promise<{ text: string; model: string }> {
  // Try stable Gemini models
  const modelNames = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ]

  let lastError: any = null
  let rateLimitHit = false

  for (const modelName of modelNames) {
    try {
      console.log(`[GEMINI] Trying model: ${modelName}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(
        `${API_URL}/models/${modelName}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      )
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`HTTP ${response.status}: ${errorText}`)

        // Check if it's a rate limit error
        if (response.status === 429 || isRateLimitError(error)) {
          rateLimitHit = true
          console.warn(`[GEMINI] Rate limit hit on model ${modelName}`)
          lastError = error
          break // Stop trying Gemini models
        }

        throw error
      }

      const data = await response.json()

      if (data.error) {
        const error = new Error(data.error.message || 'Unknown API error')

        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          rateLimitHit = true
          console.warn(`[GEMINI] Rate limit error from API: ${data.error.message}`)
          lastError = error
          break // Stop trying Gemini models
        }

        throw error
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('No text in response')
      }

      console.log(`[GEMINI] Successfully used model: ${modelName}`)
      return { text, model: modelName }
    } catch (error: any) {
      // Check if it's a rate limit error
      if (isRateLimitError(error)) {
        rateLimitHit = true
        console.warn(`[GEMINI] Rate limit detected: ${error.message}`)
        lastError = error
        break // Stop trying Gemini models
      }

      console.log(`[GEMINI] Model ${modelName} failed:`, error.message)
      lastError = error
      // Continue to next model
    }
  }

  // If rate limit was hit, try Mistral as fallback
  if (rateLimitHit) {
    console.log('[GEMINI] Rate limit reached, falling back to Mistral API...')
    try {
      const { generateVerdictWithMistral } = await import('./mistral')
      return await generateVerdictWithMistral(prompt)
    } catch (mistralError: any) {
      console.error('[GEMINI] Mistral fallback also failed:', mistralError.message)
      throw new Error(`Both Gemini (rate limited) and Mistral failed. Mistral error: ${mistralError.message}`)
    }
  }

  // If all models failed (but not due to rate limit), throw the last error
  console.error('[GEMINI] All Gemini models failed. Last error:', lastError)
  throw new Error(`Gemini API error: All models failed. Last error: ${lastError?.message || 'Unknown error'}`)
}
