# Mistral API Fallback Setup

## Overview

The system now automatically falls back to Mistral API when Gemini API hits rate limits. This ensures continuous verdict generation even when one API is exhausted.

## How It Works

1. **Primary**: System tries Gemini API first (gemini-2.5-flash models)
2. **Rate Limit Detection**: If Gemini returns a 429 error or rate limit message, the system automatically switches to Mistral
3. **Fallback**: Mistral API is used with the model specified in your configuration
4. **Seamless**: The verdict generation continues without interruption

## Setup

### 1. Add Mistral API Key

Add to your `.env.local` file:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 2. Model Configuration

The system will try these Mistral models in order:
1. `devstral-2512` (your specified model)
2. `mistral-large-latest`
3. `mistral-medium-latest`
4. `pixtral-large-latest`

If the first model fails, it automatically tries the next one.

## Rate Limit Detection

The system detects Gemini rate limits by checking for:
- HTTP 429 status codes
- Error messages containing "rate limit", "quota", or "RESOURCE_EXHAUSTED"
- API error responses indicating quota exhaustion

When detected, it immediately switches to Mistral without retrying Gemini.

## Logging

You'll see these log messages:

**When using Gemini:**
```
[GEMINI] Trying model: gemini-2.5-flash
[GEMINI] Successfully used model: gemini-2.5-flash
```

**When rate limit is hit:**
```
[GEMINI] Rate limit hit on model gemini-2.5-flash
[GEMINI] Rate limit reached, falling back to Mistral API...
[MISTRAL] Trying model: devstral-2512
[MISTRAL] Successfully used model: devstral-2512
```

**When Mistral is used:**
```
[MISTRAL] Trying model: devstral-2512
[MISTRAL] Successfully used model: devstral-2512
```

## Verdict Storage

Verdicts generated with Mistral are stored with the model name prefixed:
- Model name in DB: `mistral-devstral-2512`
- This helps track which API was used for each verdict

## Error Handling

- If Gemini rate limit is hit → Automatically switches to Mistral
- If Mistral also fails → Error is logged and the verdict generation fails for that student
- The system continues processing other students even if one fails

## Testing

To test the fallback:

1. Temporarily set a very low rate limit in `src/lib/verdict-service.ts`
2. Or simulate a rate limit by modifying the Gemini API call
3. Check logs to see the automatic switch to Mistral

## Notes

- Mistral API key is optional - if not set, the system will only use Gemini
- If both APIs fail, the error is logged and the student's verdict generation is skipped
- The system processes students in batches, so rate limits are handled gracefully
- Verdicts are stored with the model name, so you can track which API was used

## API Keys

Get your Mistral API key from: https://console.mistral.ai/

Make sure to:
- Keep the API key secure (never commit to git)
- Set appropriate rate limits in Mistral console
- Monitor usage in both Gemini and Mistral dashboards

