# Background Sync Verification

## ✅ Confirmation: All Background Scripts Are Running

The background worker runs **every 5 minutes** and syncs the following:

### 1. **College Tracker** ✅
- **Route**: `/api/sync/college-tracker`
- **Collection**: `college_sheets`
- **Upsert Logic**: ✅ Uses `updateOne` with `{ upsert: true }`
- **TR2 Filter**: ❌ Not applicable (college data, not student-specific)

### 2. **Assessment Data** ✅
- **Route**: `/api/sync/assessment`
- **Collection**: `students`
- **Upsert Logic**: ✅ Uses `updateOne` with `{ upsert: true }`
- **TR2 Filter**: ✅ **YES** - Only processes students whose `student_uid` exists in `students-tr2` collection
  - Line 40-49: Fetches all `student_uid` values from `students-tr2`
  - Line 143: Checks `if (!validStudentUids.has(student_uid))` before processing
  - Skips students not in TR2

### 3. **TR1 Data** ✅
- **Route**: `/api/sync/tr1`
- **Collection**: `students-tr1`
- **Upsert Logic**: ✅ Uses `updateOne` with `{ upsert: true }`
- **TR2 Filter**: ✅ **YES** - Only updates students already present in `students-tr2`
  - Line 149-156: Checks if student exists in `students-tr2` before processing
  - Skips students not in TR2

### 4. **TR2 Data** ✅
- **Route**: `/api/sync/tr2`
- **Collection**: `students-tr2`
- **Upsert Logic**: ✅ Uses `updateOne` with `{ upsert: true }`
- **TR2 Filter**: ❌ Not applicable (this is the source data)

### 5. **Final Verdicts** ✅
- **Route**: `/api/sync/verdicts`
- **Collection**: `final_verdicts`
- **Upsert Logic**: ✅ Uses `updateOne` with `{ upsert: true }`
- **TR2 Filter**: ✅ **YES** - Only generates verdicts for students in `students-tr2`
  - Line 276-279: Fetches all students from `students-tr2` collection
  - Line 293-295: Filters to only students in TR2 who don't have verdicts yet

## Summary

### ✅ All Scripts Running
- College Tracker: ✅
- Assessment: ✅
- TR1: ✅
- TR2: ✅
- Final Verdicts: ✅

### ✅ No Repeated Data
- All routes use `updateOne` with `{ upsert: true }`
- This means:
  - If record exists → **Updates** it (no duplicates)
  - If record doesn't exist → **Creates** it
  - Uses `student_uid` as the unique identifier

### ✅ TR2 Filtering Applied
- **Assessment**: ✅ Only processes students in TR2
- **TR1**: ✅ Only processes students in TR2
- **TR2**: N/A (source data)
- **Verdicts**: ✅ Only generates for students in TR2

## Background Worker Schedule

- **Frequency**: Every 5 minutes
- **Runs**: Automatically when app starts (`npm run dev` or `npm start`)
- **Process**:
  1. Syncs College Tracker
  2. Syncs Assessment (filtered by TR2)
  3. Syncs TR1 (filtered by TR2)
  4. Syncs TR2
  5. Waits 5 seconds
  6. Generates verdicts (only for TR2 students without verdicts)

## Verification Commands

To verify the background worker is running, check server logs for:
```
[INIT] Background worker initialized successfully
[WORKER] Starting background worker (sync every 5 minutes)
[WORKER] Starting background sync...
[SYNC] Starting full data sync...
[SYNC] Syncing college tracker...
[SYNC] Syncing assessment data...
[SYNC] Syncing TR1 data...
[SYNC] Syncing TR2 data...
[VERDICT SYNC] Starting verdict generation...
```

## Data Flow

```
Google Sheets
    ↓
College Tracker → college_sheets (all colleges)
    ↓
TR2 Sheet → students-tr2 (all TR2 students)
    ↓
Assessment Sheets → students (only TR2 students)
    ↓
TR1 Sheet → students-tr1 (only TR2 students)
    ↓
AI Verdict Generation → final_verdicts (only TR2 students)
```

## Key Points

1. **TR2 is the source of truth** - Only students in TR2 get assessment, TR1, and verdicts
2. **No duplicates** - All routes use upsert logic
3. **Automatic** - Everything runs in background every 5 minutes
4. **Error handling** - Individual failures don't stop the entire sync

