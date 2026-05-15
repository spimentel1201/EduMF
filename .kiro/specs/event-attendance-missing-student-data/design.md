# Event Attendance Missing Student Data — Bugfix Design

## Overview

When a user navigates to the Event Attendance page for an event that already has a saved attendance record, the page loads the existing entries but displays them with blank student names, empty student ID numbers, and missing grade/section information.

The root cause is a two-part problem:

1. **Missing `grade` and `section` in the stored entries**: The `EventAttendanceRecord` model's `StudentAttendanceEntrySchema` does not include `grade` or `section` fields. When entries are saved, only `studentId`, `attendance`, `tutorPresence`, and `tutorName` are persisted. When the frontend loads the saved record, `entry.grade` and `entry.section` are always `undefined`, so they fall back to empty strings.

2. **Missing student name and DNI from populated data**: The backend correctly populates `entries.studentId` with `firstName`, `lastName`, and `dni` from the `User` model. However, the `User` model has no `toJSON` transform, so populated user objects serialize with `_id` (not `id`). The frontend reads `entry.studentId?._id` for the record `id` — this is correct. But the frontend also reads `entry.studentId?.lastName`, `entry.studentId?.firstName`, and `entry.studentId?.dni` — these fields ARE present in the populated object. The actual failure is that when `grade` and `section` are empty, the filter/display logic still works, but the name/DNI fields may be missing if the populate is not returning data as expected through the API serialization chain.

The fix requires:
- Adding `grade` and `section` fields to `StudentAttendanceEntrySchema` so they are persisted and returned
- Updating `upsertAttendanceRecord` (and its callers) to accept and store `grade` and `section` per entry
- Updating the frontend `SaveAttendanceEntry` type and the save logic to include `grade` and `section`
- Verifying the frontend mapping correctly reads populated student fields from the API response

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — a saved `EventAttendanceRecord` exists for the event, causing the page to load entries from the record instead of the fresh student list
- **Property (P)**: The desired behavior — each loaded entry SHALL display the student's full name, DNI, grade, and section correctly
- **Preservation**: Existing behavior for events with no saved record (fresh student list load), save/update operations, and attendance toggle logic that must remain unchanged
- **`StudentAttendanceEntrySchema`**: The Mongoose subdocument schema in `EventAttendanceRecord.ts` that defines the shape of each attendance entry stored in the database
- **`getEventAttendance`**: The backend controller in `eventController.ts` that fetches the saved record and populates `entries.studentId` with `firstName`, `lastName`, `dni`
- **`eventService.getEventAttendance`**: The frontend service method in `eventService.ts` that calls `GET /api/events/:eventId/attendance` and returns `response.data.data` (i.e., `{ record, summary }`)
- **`hasSavedRecord`**: The boolean state in `EventAttendancePage.tsx` that, when `true`, skips the fresh student list fetch and uses the loaded record entries instead

## Bug Details

### Bug Condition

The bug manifests when the frontend loads a saved `EventAttendanceRecord` for an event. The `getEventAttendance` API call returns entries where `grade` and `section` are absent (not stored in the schema), and the populated `studentId` object may not serialize correctly through the full response chain, resulting in blank display fields.

**Formal Specification:**
```
FUNCTION isBugCondition(eventId)
  INPUT: eventId of type string
  OUTPUT: boolean

  savedRecord := EventAttendanceRecord.findOne({ eventId })
  RETURN savedRecord IS NOT NULL
         AND savedRecord.entries.length > 0
END FUNCTION
```

### Examples

- **Example 1**: User saves attendance for "Día del Logro" with 30 students. User navigates away and returns to the attendance page. The page loads the saved record. Each row shows an avatar with initials from an empty string (two blank characters), "ID: " with no number, and empty grade/section filter options.
- **Example 2**: User opens the attendance page for an event with a saved record. The grade filter dropdown shows only "Todos los grados" because all `entry.grade` values are empty strings.
- **Example 3**: User opens the attendance page for an event with NO saved record. The fresh student list loads correctly with full names, DNIs, grades, and sections. (This is the non-buggy path.)
- **Edge case**: An event with a saved record containing a single entry — the single row displays blank name and ID.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Loading the fresh student list for events with no saved record must continue to work exactly as before
- Saving attendance for the first time (POST) must continue to create a new record correctly
- Updating an already-saved attendance record (PUT) must continue to persist changes correctly
- Attendance toggle logic (present/absent clearing tutor fields) must remain unchanged
- Tutor presence and tutor name field behavior must remain unchanged
- Pagination and filter logic must remain unchanged

**Scope:**
All code paths that do NOT involve loading a saved `EventAttendanceRecord` should be completely unaffected by this fix. This includes:
- The fresh student list fetch (`GET /api/events/:eventId/attendance/students`)
- The save attendance flow (`POST /api/events/:eventId/attendance`)
- The update attendance flow (`PUT /api/events/:eventId/attendance`)
- All UI interaction logic (toggles, inputs, pagination, filters)

## Hypothesized Root Cause

Based on code analysis, the confirmed root causes are:

1. **`grade` and `section` not stored in `StudentAttendanceEntrySchema`**: The schema only stores `studentId`, `attendance`, `tutorPresence`, and `tutorName`. When the frontend maps loaded entries, `entry.grade ?? ''` and `entry.section ?? ''` always resolve to empty strings. This is the primary confirmed cause of missing grade/section data.

2. **`grade` and `section` not passed to `upsertAttendanceRecord`**: The frontend's `handleSave` function builds `SaveAttendanceEntry` objects that include only `studentId`, `attendance`, `tutorPresence`, and `tutorName`. Even if the schema were updated, the values would not be saved without also updating the save payload.

3. **Populated student fields may not reach the frontend intact**: The `User` model has no `toJSON` transform, so populated `studentId` objects serialize with `_id` (not `id`). The frontend reads `entry.studentId?._id` for the record `id` — this is correct. The `firstName`, `lastName`, and `dni` fields should be present in the serialized response. If they are missing, it may be due to Mongoose's `toJSON` on the parent document not recursively applying to populated subdocuments in all versions.

4. **`id` field mapping uses enrollment `_id` for fresh load but student `_id` for saved load**: When loading fresh students, `getStudentsForEvent` returns `id: enrollment._id.toString()` (the enrollment ID). When loading from a saved record, the frontend uses `entry.studentId?._id` (the student/user ID). This inconsistency means the `id` used for `handleSave` differs between first save and subsequent saves — but since `upsertAttendanceRecord` uses `findOneAndReplace`, this does not cause data corruption. However, it is worth noting.

## Correctness Properties

Property 1: Bug Condition — Saved Record Entries Display Complete Student Data

_For any_ event where a saved `EventAttendanceRecord` exists with at least one entry, loading the Event Attendance page SHALL display each entry with the student's full name in "Apellido, Nombre" format, the student's DNI as the student ID, and the correct grade and section values.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Fresh Student List Load Unaffected

_For any_ event where NO saved `EventAttendanceRecord` exists, loading the Event Attendance page SHALL continue to display all enrolled students with their full names, DNIs, grades, and sections loaded from the fresh student list endpoint, exactly as before the fix.

**Validates: Requirements 3.1, 3.4**

Property 3: Preservation — Save and Update Operations Unaffected

_For any_ save or update operation on event attendance, the fixed code SHALL continue to correctly persist all attendance entries (studentId, attendance, tutorPresence, tutorName, grade, section) and return a valid record, preserving all existing save/update behavior.

**Validates: Requirements 3.2, 3.3**

## Fix Implementation

### Changes Required

**File 1**: `backend/src/models/EventAttendanceRecord.ts`

**Change**: Add `grade` and `section` fields to `StudentAttendanceEntrySchema`

**Specific Changes**:
1. Add `grade: { type: String, trim: true }` to `StudentAttendanceEntrySchema`
2. Add `section: { type: String, trim: true }` to `StudentAttendanceEntrySchema`
3. Update `IStudentAttendanceEntry` interface to include `grade?: string` and `section?: string`

---

**File 2**: `backend/src/services/eventAttendanceService.ts`

**Change**: Update `validateEntries` and `upsertAttendanceRecord` to accept and handle `grade`/`section`

**Specific Changes**:
1. Update the `entries` parameter type in `validateEntries` to include optional `grade` and `section` fields (no validation logic needed for these fields — they are informational)
2. No changes needed to `upsertAttendanceRecord` itself since it passes entries directly to Mongoose — the new schema fields will be picked up automatically

---

**File 3**: `backend/src/controllers/eventController.ts`

**Change**: Verify `getEventAttendance` returns populated data correctly

**Specific Changes**:
1. No changes needed — `.populate('entries.studentId', 'firstName lastName dni')` is already correct
2. The response structure `{ success: true, data: { record, summary } }` is already correct and matches what the frontend expects

---

**File 4**: `src/services/eventService.ts`

**Change**: Update `SaveAttendanceEntry` type to include `grade` and `section`

**Specific Changes**:
1. Add `grade?: string` and `section?: string` to the `SaveAttendanceEntry` interface

---

**File 5**: `src/pages/EventAttendancePage.tsx`

**Change**: Update `handleSave` to include `grade` and `section` in each entry, and verify the mapping from loaded record entries

**Specific Changes**:
1. In `handleSave`, include `grade: r.grade` and `section: r.section` in each `SaveAttendanceEntry` object
2. Verify the mapping in the `getEventAttendance` `.then()` callback correctly reads `entry.studentId?.lastName`, `entry.studentId?.firstName`, `entry.studentId?.dni`, and `entry.studentId?._id` — these should work with the populated response
3. Add a fallback: if `entry.studentId` is a plain string (not populated), log a warning and use empty strings gracefully

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate loading a saved `EventAttendanceRecord` via the `getEventAttendance` API and assert that the returned entries contain populated student fields and grade/section data. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Saved Record Returns Grade/Section**: Call `GET /api/events/:eventId/attendance` for an event with a saved record and assert `record.entries[0].grade` is not empty (will fail on unfixed code — field not in schema)
2. **Saved Record Returns Student Name**: Call `GET /api/events/:eventId/attendance` and assert `record.entries[0].studentId.lastName` is a non-empty string (may fail if populate serialization is broken)
3. **Saved Record Returns DNI**: Call `GET /api/events/:eventId/attendance` and assert `record.entries[0].studentId.dni` is a non-empty string
4. **Frontend Mapping Produces Non-Empty Name**: Simulate the frontend mapping logic with a mock API response and assert the resulting `StudentRecord.name` is not empty

**Expected Counterexamples**:
- `record.entries[0].grade` is `undefined` or missing from the response
- `record.entries[0].section` is `undefined` or missing from the response
- Possible causes: fields not in schema, fields not passed during save

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL eventId WHERE isBugCondition(eventId) DO
  response := GET /api/events/:eventId/attendance
  record := response.data.data.record
  FOR ALL entry IN record.entries DO
    ASSERT entry.grade IS NOT EMPTY
    ASSERT entry.section IS NOT EMPTY
    ASSERT entry.studentId.lastName IS NOT EMPTY
    ASSERT entry.studentId.firstName IS NOT EMPTY
    ASSERT entry.studentId.dni IS NOT EMPTY
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL eventId WHERE NOT isBugCondition(eventId) DO
  students_original := GET /api/events/:eventId/attendance/students
  students_fixed    := GET /api/events/:eventId/attendance/students
  ASSERT students_original = students_fixed
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual tests might miss.

**Test Cases**:
1. **Fresh Student List Preservation**: Verify `GET /api/events/:eventId/attendance/students` returns the same data before and after the fix
2. **Save Operation Preservation**: Verify `POST /api/events/:eventId/attendance` continues to create records correctly after the schema change
3. **Update Operation Preservation**: Verify `PUT /api/events/:eventId/attendance` continues to update records correctly
4. **Attendance Toggle Preservation**: Verify that setting attendance to "absent" still clears tutor fields in the UI

### Unit Tests

- Test that `StudentAttendanceEntrySchema` accepts and stores `grade` and `section` fields
- Test that `upsertAttendanceRecord` persists `grade` and `section` when provided
- Test that `getEventAttendance` returns populated `firstName`, `lastName`, `dni` on `entries.studentId`
- Test the frontend mapping function with a mock populated entry to verify correct `name` and `studentId` output

### Property-Based Tests

- Generate random sets of student entries with varying grade/section values and verify all are stored and returned correctly
- Generate random attendance records and verify that the fresh student list endpoint is unaffected by the schema change
- Test that for any saved record, the frontend mapping always produces a non-empty `name` when `studentId` is populated

### Integration Tests

- End-to-end: Save attendance for an event, navigate away, return to the page, and verify all student names, IDs, grades, and sections are displayed correctly
- Verify that the grade and section filter dropdowns populate correctly after loading a saved record
- Verify that saving an updated record after loading a saved record correctly persists all changes
