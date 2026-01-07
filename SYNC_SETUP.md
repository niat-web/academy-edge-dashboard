# Automatic Data Sync & Verdict Generation Setup

This application automatically syncs data from Google Sheets to MongoDB and generates AI verdicts every 5 minutes.

## How It Works

1. **Data Sync**: Every 5 minutes, the system syncs:
   - College tracker data
   - Assessment data
   - TR1 interview data
   - TR2 interview data

2. **Verdict Generation**: After data sync, the system automatically generates AI verdicts for all students who don't have one yet, with rate limiting to avoid API limits.

## Setup Options

### Option 1: Background Worker (Recommended for Development)

The background worker runs automatically when the app starts. It syncs data every 5 minutes.

**To start the worker:**
- The worker starts automatically when you run `npm run dev` or `npm start`
- Or call `GET /api/init-worker` once to initialize it

### Option 2: External Cron Job (Recommended for Production)

Use an external cron service to call the sync endpoint every 5 minutes.

**Setup Steps:**

1. **Using EasyCron, cron-job.org, or similar:**
   - URL: `https://your-domain.com/api/cron/sync`
   - Method: GET or POST
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Optional: Add `Authorization: Bearer YOUR_CRON_SECRET` header

2. **Using Server Cron (Linux/Mac):**
   ```bash
   # Add to crontab (crontab -e)
   */5 * * * * curl -X GET https://your-domain.com/api/cron/sync
   ```

3. **Environment Variables:**
   ```env
   CRON_SECRET=your-secret-key-here  # Optional, for authentication
   NEXT_PUBLIC_BASE_URL=https://your-domain.com  # Required for cron to work
   ```

## API Endpoints

### `/api/sync/all` (POST)
Syncs all data from Google Sheets to MongoDB.
- College tracker
- Assessment data
- TR1 data
- TR2 data

### `/api/sync/verdicts` (POST)
Generates AI verdicts for all students who don't have one yet.
- Processes in batches of 10
- Includes rate limiting (15 requests/minute, 900/hour)
- 2-second delay between requests

### `/api/cron/sync` (GET/POST)
Combined endpoint that:
1. Syncs all data
2. Generates verdicts (with 5-second delay)

### `/api/init-worker` (GET)
Initializes the background worker (runs sync every 5 minutes).

## Rate Limiting

The verdict generation service includes built-in rate limiting:
- **15 requests per minute** (Gemini API limit)
- **900 requests per hour** (conservative limit)
- **2-second delay** between individual student verdicts
- **5-second delay** between data sync and verdict generation

## Error Handling

The system handles errors gracefully:
- Individual college sheet failures don't stop the entire sync
- Missing data fields are logged but don't crash the process
- API rate limit errors are caught and logged
- Network errors are retried automatically
- All errors are logged to console for debugging

## Verdict Storage

- Verdicts are stored in the `final_verdicts` collection
- Each verdict includes: `student_uid`, `summary`, `strengths`, `improvements`, `recommendation`, `model`, `generated_at`
- Verdicts are only generated once per student (checked before generation)
- The frontend fetches verdicts from the database (no on-demand generation)

## Monitoring

Check the console logs for:
- `[SYNC]` - Data sync operations
- `[VERDICT SYNC]` - Verdict generation operations
- `[WORKER]` - Background worker operations
- `[CRON]` - Cron job operations

## Troubleshooting

1. **Verdicts not generating:**
   - Check if `GEMINI_API_KEY` is set in `.env.local`
   - Check console logs for rate limit errors
   - Verify student data exists in MongoDB

2. **Sync not running:**
   - Check if background worker is initialized
   - Verify Google Sheets API credentials are set
   - Check console logs for errors

3. **Rate limit errors:**
   - The system automatically handles rate limits
   - Verdicts will be generated in subsequent sync cycles
   - Adjust `GEMINI_RATE_LIMIT` in `src/lib/verdict-service.ts` if needed

