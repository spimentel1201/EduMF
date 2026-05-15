# Event Attendance Missing Student Data — Tasks

## Implementation Tasks

- [x] 1. Update `StudentAttendanceEntrySchema` to store `grade` and `section`
  - [x] 1.1 Add `grade?: string` and `section?: string` to the `IStudentAttendanceEntry` interface in `backend/src/models/EventAttendanceRecord.ts`
  - [x] 1.2 Add `grade: { type: String, trim: true }` and `section: { type: String, trim: true }` fields to `StudentAttendanceEntrySchema` in `backend/src/models/EventAttendanceRecord.ts`

- [x] 2. Update `SaveAttendanceEntry` type and save payload on the frontend
  - [x] 2.1 Add `grade?: string` and `section?: string` to the `SaveAttendanceEntry` interface in `src/services/eventService.ts`
  - [x] 2.2 Update `handleSave` in `src/pages/EventAttendancePage.tsx` to include `grade: r.grade` and `section: r.section` in each entry object passed to `saveEventAttendance` / `updateEventAttendance`

- [x] 3. Verify and fix the frontend mapping of loaded record entries
  - [x] 3.1 In `EventAttendancePage.tsx`, confirm the `.then(({ record }) => ...)` callback correctly reads `entry.studentId?._id`, `entry.studentId?.lastName`, `entry.studentId?.firstName`, and `entry.studentId?.dni` from the populated API response
  - [x] 3.2 Add a defensive check: if `entry.studentId` is a string (not a populated object), fall back to empty strings and log a warning so the page does not crash silently

- [x] 4. Verify backend `getEventAttendance` controller serialization
  - [x] 4.1 Confirm that calling `record.toJSON()` (implicit in `res.json()`) correctly serializes the populated `entries.studentId` User objects with `_id`, `firstName`, `lastName`, and `dni` fields accessible to the frontend
  - [x] 4.2 If the `User` model's default serialization exposes `password` or other sensitive fields through the populate projection, confirm the `.populate('entries.studentId', 'firstName lastName dni')` projection correctly limits the returned fields
