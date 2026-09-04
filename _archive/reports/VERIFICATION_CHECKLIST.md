# Local Verification Checklist

Run this checklist after cloning/pulling to verify the MVP is working.

---

## ✅ Pre-Flight Checks (2 minutes)

- [ ] `node --version` (should be v16+)
- [ ] `npm --version` (should be v8+)
- [ ] Project directory exists: `d:\Clients\2026\VilPower\Task Tracking Project`
- [ ] `.env` file exists (copy from `.env.template` if needed)

---

## ✅ Installation (3 minutes)

```bash
cd "d:\Clients\2026\VilPower\Task Tracking Project"
npm install
```

- [ ] No errors during `npm install`
- [ ] `node_modules/` directory created
- [ ] `package-lock.json` updated

---

## ✅ Code Quality (2 minutes)

```bash
npm run lint
```

**Expected Output**: 
```
✓ No errors found
```

- [ ] TypeScript compilation passes
- [ ] ESLint check passes
- [ ] No "0 errors found" warnings

---

## ✅ Unit Tests (2 minutes)

```bash
npm test
```

**Expected Output**:
```
✓ src/services/ScoreCalculator.test.ts (28 tests)
  ✓ calculateCreativityScore (16 tests)
  ✓ calculateBatch (3 tests)
  ✓ validateResults (3 tests)
  ✓ getMetadata (3 tests)
  ✓ edge cases (3 tests)

Test Files  1 passed
Tests      28 passed
```

**Checklist**:
- [ ] All 28 tests pass
- [ ] Test execution time < 5 seconds
- [ ] No failed assertions
- [ ] No warnings in test output

---

## ✅ Core Logic Verification (5 minutes)

### Test 1: Score Formula

The formula MUST be: `(Composition×0.35) + (ColorTheory×0.35) + (Balance×0.30)`

```typescript
// Test cases:
(100, 100, 100) → 100 ✓
(80, 75, 70) → 75 ✓
(85, 78, 82) → 82 ✓
(0, 0, 0) → 0 ✓
```

- [ ] Formula is correctly weighted
- [ ] Rounding works properly
- [ ] Edge cases handled

### Test 2: Validation

Invalid scores MUST be rejected:

```typescript
(150, 80, 80) → Invalid ✓
(80, -10, 80) → Invalid ✓
(80, 80, 101) → Invalid ✓
```

- [ ] Out-of-range scores rejected
- [ ] Error messages are clear
- [ ] Valid scores pass validation

### Test 3: Batch Processing

```typescript
[score1, score2, score3] → [result1, result2, result3]
```

- [ ] Multiple scores processed correctly
- [ ] Results maintain consistency
- [ ] Performance is acceptable (<10ms for 100 scores)

---

## ✅ File Structure (1 minute)

Verify these files exist:

**Services** (5 files):
- [ ] `src/services/ScoreCalculator.ts` ✅
- [ ] `src/services/AIVisionClient.ts` ✅
- [ ] `src/services/EvaluationPipeline.ts` ✅
- [ ] `src/services/SubmissionService.ts` ✅
- [ ] `src/services/SubmissionDetector.ts` ✅

**Types** (8 files):
- [ ] `src/types/media.ts` ✅
- [ ] `src/types/evaluation.ts` ✅
- [ ] `src/types/submission.ts` ✅
- [ ] `src/types/award.ts` ✅
- [ ] `src/types/audit.ts` ✅
- [ ] `src/types/stats.ts` ✅
- [ ] `src/types/dto.ts` ✅
- [ ] `src/types/index.ts` ✅

**Configuration** (2 files):
- [ ] `src/config/firebase.ts` ✅
- [ ] `src/config/environment.ts` ✅

**Database** (2 files):
- [ ] `src/db/schemas.ts` ✅
- [ ] `src/db/index.ts` ✅

---

## ✅ Configuration Check (2 minutes)

Required for Firebase testing:

```bash
# Check .env file
cat .env | grep FIREBASE
cat .env | grep GOOGLE_CLOUD
```

- [ ] `FIREBASE_PROJECT_ID` is set
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON
- [ ] `GOOGLE_CLOUD_API_KEY` is set (optional for mock testing)

---

## ✅ Firebase Integration (Optional - 5 minutes)

If Firebase is configured:

```bash
# Seed test data
node --loader ts-node/esm -e "import { seedSampleSubmissions } from './src/services/sample-test-data.ts'; seedSampleSubmissions().then(() => process.exit(0))"
```

- [ ] 3 test submissions created in Firebase
- [ ] Submissions appear in Firestore console
- [ ] Status is "pending_evaluation"

---

## ✅ AI Vision Integration (Optional - 5 minutes)

If Google Cloud Vision is configured:

```bash
# Test AIVisionClient connectivity
node --loader ts-node/esm -e "import { AIVisionClient } from './src/services/AIVisionClient.ts'; new AIVisionClient().testConnectivity().then(r => console.log(r))"
```

- [ ] Primary provider configured
- [ ] Secondary fallback available
- [ ] Mock scoring works

---

## ✅ Full System Check (10 minutes)

If all dependencies available:

```bash
# Start detector
node --loader ts-node/esm -e "import { SubmissionDetector } from './src/services/SubmissionDetector.ts'; const d = new SubmissionDetector(); d.start()"
```

Monitor logs for:
- [ ] "SubmissionDetector scheduler started"
- [ ] "Starting submission detection cycle"
- [ ] Submissions created in Firebase

---

## ✅ Performance Verification (5 minutes)

Run performance benchmarks:

```bash
# Test score calculation speed
time npm run test -- ScoreCalculator.test.ts
```

- [ ] ScoreCalculator test runs in <1 second
- [ ] All 28 tests pass
- [ ] No performance warnings

---

## ✅ Documentation Check (2 minutes)

Verify documentation files exist:

- [ ] `LOCAL_TESTING_GUIDE.md` ✅ (Complete with setup instructions)
- [ ] `MVP_COMPLETION_SUMMARY.md` ✅ (Shows what's implemented)
- [ ] `VERIFICATION_CHECKLIST.md` ✅ (This file)

---

## Summary

### If All Checks Pass ✅

The MVP is working correctly:
- ✅ Core logic verified (score calculation)
- ✅ All unit tests passing (28/28)
- ✅ Code quality excellent
- ✅ Ready for Firebase integration
- ✅ Ready for AI Vision integration
- ✅ Ready for deployment

**Next Step**: Configure Firebase credentials and test submission detection

### If Any Checks Fail ❌

1. Review the specific failing check
2. Check the error message details
3. See troubleshooting guide in `LOCAL_TESTING_GUIDE.md`
4. Verify `.env` configuration
5. Re-run: `npm install && npm test`

---

## Quick Commands

```bash
# Run everything
npm install && npm run lint && npm test

# Just the critical test
npm test -- ScoreCalculator.test.ts

# Watch mode (auto-rerun on changes)
npm run test:watch

# Detailed output
npm run test:pbt
```

---

## Support

If something fails:

1. **TypeScript errors?**
   ```bash
   npm run lint:fix
   npm run format
   ```

2. **Test failures?**
   ```bash
   npm run test:pbt  # Verbose output
   npm test -- --reporter=verbose
   ```

3. **Installation issues?**
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```

4. **Firebase issues?**
   - Verify `.env` has valid service account JSON
   - Check Firebase project ID matches
   - Verify Firestore collections exist

---

**✅ Ready to verify!**

Run: `npm install && npm test`

Expected result: **28/28 unit tests passing** ✅
