/**
 * Mistral API helper for generating verdicts
 * Used as fallback when Gemini API hits rate limits
 */

if (!process.env.MISTRAL_API_KEY) {
  console.warn('MISTRAL_API_KEY environment variable is not set. Mistral fallback will not be available.')
}

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

// Mistral model names - user specified "devstral-2512" but we'll also try common models
const MISTRAL_MODELS = [
  'devstral-2512', // User specified
  'mistral-large-latest',
  'mistral-medium-latest',
  'pixtral-large-latest',
]

export async function generateVerdictWithMistral(prompt: string): Promise<{ text: string; model: string }> {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY environment variable is not set')
  }

  let lastError: any = null

  for (const modelName of MISTRAL_MODELS) {
    try {
      console.log(`[MISTRAL] Trying model: ${modelName}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }, // Request JSON response
        }),
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`[MISTRAL] Model ${modelName} failed with status ${response.status}: ${errorText}`)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'Unknown API error')
      }

      const text = data.choices?.[0]?.message?.content
      if (!text) {
        throw new Error('No text in response')
      }

      console.log(`[MISTRAL] Successfully used model: ${modelName}`)
      return { text, model: `mistral-${modelName}` }
    } catch (error: any) {
      console.log(`[MISTRAL] Model ${modelName} failed:`, error.message)
      lastError = error
      // Continue to next model
    }
  }

  // If all models failed, throw the last error
  console.error('[MISTRAL] All Mistral models failed. Last error:', lastError)
  throw new Error(`Mistral API error: All models failed. Last error: ${lastError?.message || 'Unknown error'}`)
}

