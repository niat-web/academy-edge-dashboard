# Production Setup Guide

## Quick Answer

**Yes, the backend scripts will work when you run the app!** The background worker automatically starts when you run either:
- `npm run dev` (development)
- `npm start` (production)

## Production Deployment Steps

### 1. Build the Application

```bash
npm run build
```

This creates an optimized production build.

### 2. Start the Production Server

```bash
npm start
```

The background worker will automatically start and begin syncing data every 5 minutes.

### 3. Environment Variables

Make sure you have all required environment variables set in your production environment:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Google Sheets API
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Optional: For external cron jobs
CRON_SECRET=your_secret_key
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 4. Verify It's Working

Check your server logs. You should see:

```
[INIT] Background worker initialized successfully
[INIT] Sync will run every 5 minutes
[WORKER] Starting background worker (sync every 5 minutes)
[WORKER] Starting background sync...
[SYNC] Starting full data sync...
```

## How It Works

### Automatic Background Worker

1. **On App Start**: The worker initializes automatically via `src/lib/init-worker.ts`
2. **First Run**: Sync runs immediately when the app starts
3. **Scheduled Runs**: Then runs every 5 minutes automatically
4. **Process**: 
   - Syncs all data from Google Sheets → MongoDB
   - Generates AI verdicts for students who don't have one
   - Handles errors gracefully (one failure doesn't stop the process)

### Development vs Production

- **Development (`npm run dev`)**: Worker starts after 2 seconds (to let Next.js initialize)
- **Production (`npm start`)**: Worker starts immediately

Both work the same way - the worker runs in the background and syncs data every 5 minutes.

## Alternative: External Cron Job (Optional)

If you prefer to use an external cron service instead of the background worker:

1. **Disable the background worker** by commenting out the import in `src/app/layout.tsx`:
   ```typescript
   // import "@/lib/init-worker";
   ```

2. **Set up external cron** to call:
   ```
   GET/POST https://your-domain.com/api/cron/sync
   ```
   Schedule: `*/5 * * * *` (every 5 minutes)

## Monitoring

### Check Logs

The system logs all operations with prefixes:
- `[INIT]` - Worker initialization
- `[WORKER]` - Background worker operations
- `[SYNC]` - Data sync operations
- `[VERDICT SYNC]` - Verdict generation

### Health Check

You can manually trigger a sync by calling:
```bash
curl -X POST https://your-domain.com/api/sync/all
```

## Troubleshooting

### Worker Not Starting

1. Check server logs for `[INIT]` messages
2. Verify Node.js version (should be 18+ for native fetch support)
3. Check that environment variables are set correctly

### Sync Not Running

1. Check logs for `[WORKER]` messages
2. Verify MongoDB connection
3. Verify Google Sheets API credentials
4. Check for rate limit errors in logs

### Verdicts Not Generating

1. Check `GEMINI_API_KEY` is set
2. Verify student data exists in MongoDB
3. Check logs for rate limit messages
4. Verdicts are generated in batches - may take time for large student lists

## Production Best Practices

1. **Use PM2 or similar** to keep the process running:
   ```bash
   pm2 start npm --name "dashboard" -- start
   ```

2. **Set up log rotation** to manage log files

3. **Monitor API usage** for Google Sheets and Gemini APIs

4. **Set up alerts** for sync failures (check logs regularly)

5. **Use environment variables** - never commit secrets to code

## Performance Notes

- **Rate Limiting**: Built-in to prevent API limit breaches
- **Batch Processing**: Verdicts generated in batches of 10
- **Error Handling**: Individual failures don't stop the entire process
- **Memory**: Worker runs in the same process, minimal overhead

## Next Steps

1. Deploy your application
2. Set environment variables
3. Run `npm run build && npm start`
4. Monitor logs to verify sync is working
5. Check MongoDB to see data being synced

The system is production-ready and will work automatically! 🚀

