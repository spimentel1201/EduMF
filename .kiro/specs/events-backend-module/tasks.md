# Implementation Plan: Events Backend Module

## Overview

Implement the Events Backend Module end-to-end: two new Mongoose models, a service layer, an Express controller and router, route registration in `server.ts`, a typed frontend service, and updates to `EventsPage.tsx` and `EventAttendancePage.tsx` to replace mock data with real API calls. Property-based tests use **fast-check** (must be installed as a dev dependency).

## Tasks

- [x] 1. Install fast-check dev dependency
  - Run `npm install --save-dev fast-check` (or `yarn add --dev fast-check`) inside the `backend/` directory
  - Verify `fast-check` appears in `backend/package.json` devDependencies
  - _Requirements: Testing strategy in design.md_

- [x] 2. Create the Event Mongoose model
  - Create `backend/src/models/Event.ts` with the `IEvent` interface and `EventSchema` exactly as specified in the design
  - Export `EventCategory` and `EventScope` types
  - Add `pre('validate')` hook to enforce `targetGrade`/`targetSection` when `scope === 'specific'`
  - Add `toJSON` transform to expose `id` and omit `_id`/`__v`
  - Add indexes on `date`, `category`, `featured`, and the compound `scope/targetGrade/targetSection`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.1 Write property test for Event serialization (Property 1)
    - **Property 1: Event serialization omits internal fields**
    - Generate random valid event data, instantiate the model, call `.toJSON()`, assert `id` equals `_id.toString()` and neither `_id` nor `__v` is present
    - Tag: `// Feature: events-backend-module, Property 1: Event serialization omits internal fields`
    - **Validates: Requirements 1.3**

  - [ ]* 2.2 Write property test for specific-scope validation (Property 2)
    - **Property 2: Specific-scope events require targetGrade and targetSection**
    - Generate events with `scope='specific'` and randomly omit `targetGrade`, `targetSection`, or both; call `doc.validate()` and assert it throws a ValidationError
    - Tag: `// Feature: events-backend-module, Property 2: Specific-scope events require targetGrade and targetSection`
    - **Validates: Requirements 1.4**

- [x] 3. Create the EventAttendanceRecord Mongoose model
  - Create `backend/src/models/EventAttendanceRecord.ts` with `IStudentAttendanceEntry` and `IEventAttendanceRecord` interfaces and schemas as specified in the design
  - Use `{ _id: false }` on the sub-document schema
  - Add unique index on `eventId`
  - Add `toJSON` transform to expose `id` and omit `_id`/`__v`
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 4. Implement the eventAttendanceService
  - Create `backend/src/services/eventAttendanceService.ts` with the following exported functions:
    - `getStudentsForEvent(eventId, filters?)` — resolves student list based on event scope (general vs. specific), queries active SchoolYear, Enrollment, Section, and User as described in the design
    - `validateEntries(entries)` — validates business rules: `apoderado` requires `tutorName`, `absent` requires `tutorPresence === null`, no duplicate `studentId` values; throws `ApiError` with HTTP 400 on violation
    - `upsertAttendanceRecord(eventId, entries, userId)` — calls `validateEntries`, then uses `findOneAndReplace` with `upsert: true` to create or replace the record; sets `submittedBy` and `submittedAt`
    - `computeSummary(entries)` — returns `{ totalStudents, presentCount, absentCount, notRecordedCount, tutorCount, attendanceRate }` with division-by-zero guard
  - _Requirements: 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.4, 8.1, 8.3_

  - [ ]* 4.1 Write property test for validateEntries — apoderado rule (Property 9)
    - **Property 9: apoderado entries require tutorName**
    - Generate entries arrays where at least one entry has `tutorPresence='apoderado'` and `tutorName` is absent or empty; assert `validateEntries` throws with a 400 status
    - Tag: `// Feature: events-backend-module, Property 9: apoderado entries require tutorName`
    - **Validates: Requirements 4.3, 6.4**

  - [ ]* 4.2 Write property test for validateEntries — absent rule (Property 10)
    - **Property 10: Absent students cannot have tutor presence**
    - Generate entries arrays where at least one entry has `attendance='absent'` and `tutorPresence` is non-null; assert `validateEntries` throws with a 400 status
    - Tag: `// Feature: events-backend-module, Property 10: Absent students cannot have tutor presence`
    - **Validates: Requirements 4.4, 6.5**

  - [ ]* 4.3 Write property test for computeSummary statistics (Property 15)
    - **Property 15: Summary statistics are consistent with entries**
    - Generate random arrays of `IStudentAttendanceEntry` objects; call `computeSummary`; assert `presentCount`, `absentCount`, `notRecordedCount`, `tutorCount`, and `attendanceRate` all match manual computation of the same array
    - Tag: `// Feature: events-backend-module, Property 15: Summary statistics are consistent with entries`
    - **Validates: Requirements 7.4, 8.1, 8.3**

- [x] 5. Checkpoint — Ensure service layer tests pass
  - Run `yarn test` (or `npx jest`) inside `backend/` and confirm all tests pass before proceeding to the controller.

- [x] 6. Implement the eventController
  - Create `backend/src/controllers/eventController.ts` with the following handlers, following the same pattern as `attendanceController.ts`:
    - `getEvents` — paginated list with `search`, `category`, `featured`, `page`, `limit` query params; computes `attendeesCount` via aggregation pipeline on `EventAttendanceRecord`; returns `{ success, data, total, page, limit, totalPages }`
    - `createEvent` — validates required fields, creates Event, returns HTTP 201
    - `getEventById` — returns event or 404
    - `updateEvent` — updates event, returns updated document or 404
    - `deleteEvent` — deletes event, returns `{ success: true, data: {} }` or 404
    - `getStudentsForEvent` — delegates to `eventAttendanceService.getStudentsForEvent`; supports optional `grade`/`section` query params; returns 404 if event not found
    - `getEventAttendance` — returns the `EventAttendanceRecord` with populated student fields and summary stats; returns 404 if not found
    - `getEventAttendanceSummary` — returns summary stats; returns zero-counts if no record exists
    - `saveEventAttendance` — delegates to `eventAttendanceService.upsertAttendanceRecord`; returns HTTP 201
    - `updateEventAttendance` — delegates to `eventAttendanceService.upsertAttendanceRecord`; returns HTTP 200
  - All handlers must pass errors to `next(error)` and use `ApiError` for known error conditions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.5, 5.6, 6.1, 6.2, 6.6, 7.1, 7.2, 7.3, 8.1, 8.2, 10.3, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 6.1 Write property test for event list sort order (Property 3)
    - **Property 3: Event list is always sorted by date ascending**
    - Generate N events with random dates, insert them, call `getEvents` handler with a mock req/res, assert the returned `data` array is sorted by `date` ascending
    - Tag: `// Feature: events-backend-module, Property 3: Event list is always sorted by date ascending`
    - **Validates: Requirements 2.2**

  - [ ]* 6.2 Write property test for missing required fields → HTTP 400 (Property 5)
    - **Property 5: Missing required fields always produce HTTP 400**
    - Generate POST bodies with random subsets of required fields (`title`, `category`, `date`, `timeStart`, `timeEnd`, `location`) omitted; call `createEvent` handler; assert HTTP 400 is returned
    - Tag: `// Feature: events-backend-module, Property 5: Missing required fields always produce HTTP 400`
    - **Validates: Requirements 2.6**

  - [ ]* 6.3 Write property test for search filter correctness (Property 6)
    - **Property 6: Search filter returns only matching events**
    - Generate events with random titles/descriptions and a random search string; call `getEvents` with `search` param; assert every returned event's `title` or `description` contains the search string (case-insensitive) and no non-matching event appears
    - Tag: `// Feature: events-backend-module, Property 6: Search filter returns only matching events`
    - **Validates: Requirements 3.1**

  - [ ]* 6.4 Write property test for category filter correctness (Property 7)
    - **Property 7: Category filter returns only matching events**
    - Generate events with random valid categories; call `getEvents` with each `category` value; assert all returned events have that category
    - Tag: `// Feature: events-backend-module, Property 7: Category filter returns only matching events`
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 6.5 Write property test for pagination metadata consistency (Property 8)
    - **Property 8: Pagination metadata is consistent with results**
    - Generate random `page` and `limit` values and a known total event count; call `getEvents`; assert `data.length <= limit` and `totalPages === Math.ceil(total / limit)`
    - Tag: `// Feature: events-backend-module, Property 8: Pagination metadata is consistent with results`
    - **Validates: Requirements 3.4**

  - [ ]* 6.6 Write property test for attendeesCount in event list (Property 16)
    - **Property 16: attendeesCount in event list matches present entries**
    - Generate attendance records with random numbers of `present` entries; call `getEvents`; assert each event's `attendeesCount` equals the count of `present` entries in its record
    - Tag: `// Feature: events-backend-module, Property 16: attendeesCount in event list matches present entries`
    - **Validates: Requirements 10.3**

- [x] 7. Create the eventRoutes file
  - Create `backend/src/routes/eventRoutes.ts` wiring all routes from the Route Table in the design to their controller handlers
  - Apply `protect` middleware to all routes except `GET /api/events` and `GET /api/events/:id`
  - Apply `authorize('admin', 'teacher')` to POST and PUT `/api/events`
  - Apply `authorize('admin')` to DELETE `/api/events/:id`
  - Apply `protect` to all attendance sub-routes; apply `authorize('admin', 'teacher')` to POST and PUT attendance routes
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 7.1 Write property test for protected routes reject unauthenticated requests (Property 17)
    - **Property 17: Protected routes reject unauthenticated requests**
    - Generate requests to each protected route without a Bearer token; assert HTTP 401 is returned
    - Tag: `// Feature: events-backend-module, Property 17: Protected routes reject unauthenticated requests`
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ]* 7.2 Write property test for role-based authorization (Property 18)
    - **Property 18: Role-based authorization on write operations**
    - Generate DELETE requests with tokens for non-admin roles; assert HTTP 403. Generate POST/PUT requests with tokens for roles other than `admin`/`teacher`; assert HTTP 403
    - Tag: `// Feature: events-backend-module, Property 18: Role-based authorization on write operations`
    - **Validates: Requirements 9.4, 9.5**

- [x] 8. Register event routes in server.ts
  - Add `import eventRoutes from './routes/eventRoutes'` to `backend/src/server.ts`
  - Register the router with `app.use('/api/events', eventRoutes)` after the existing route registrations and before the `errorHandler` middleware
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 6.1, 6.2, 7.1, 8.1_

- [x] 9. Checkpoint — Ensure all backend tests pass
  - Run `yarn test` inside `backend/` and confirm all tests pass before proceeding to frontend work.

- [x] 10. Create the frontend eventService
  - Create `src/services/eventService.ts` with all types (`EventDTO`, `StudentRecordDTO`, `AttendanceSummaryDTO`, `PaginatedEventsResponse`) and the following exported functions using the shared `api` axios instance from `src/services/api.ts`:
    - `getEvents(params?)` — GET `/api/events` with optional `search`, `category`, `featured`, `page`, `limit`
    - `getEventById(id)` — GET `/api/events/:id`
    - `createEvent(data)` — POST `/api/events`
    - `updateEvent(id, data)` — PUT `/api/events/:id`
    - `deleteEvent(id)` — DELETE `/api/events/:id`
    - `getStudentsForEvent(eventId, filters?)` — GET `/api/events/:eventId/attendance/students`
    - `getEventAttendance(eventId)` — GET `/api/events/:eventId/attendance`
    - `saveEventAttendance(eventId, entries)` — POST `/api/events/:eventId/attendance`
    - `updateEventAttendance(eventId, entries)` — PUT `/api/events/:eventId/attendance`
    - `getEventAttendanceSummary(eventId)` — GET `/api/events/:eventId/attendance/summary`
  - Each function should return `response.data.data` (unwrapping the success envelope)
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 10.1 Write property test for student record shape and name format (Property 11)
    - **Property 11: Student records have the correct shape and name format**
    - Generate mock API responses with random `firstName`/`lastName`/`dni` values; assert each mapped record has `id`, `name` formatted as `"Apellido, Nombre"`, `studentId` equal to `dni`, `grade`, and `section`
    - Tag: `// Feature: events-backend-module, Property 11: Student records have the correct shape and name format`
    - **Validates: Requirements 5.4, 10.2**

- [x] 11. Update EventsPage.tsx to use real API
  - Replace the `MOCK_EVENTS` constant and all direct references to it with state loaded from `eventService.getEvents()`
  - Add `useEffect` to fetch events on mount and when `search`, `activeCategory`, or `page` changes
  - Add loading and error states; show a spinner or skeleton while loading and an error message on failure
  - Pass `search`, `category` (when not `'all'`), `page`, and `limit` (6) as query params to `getEvents`
  - Use the `total` and `totalPages` from the API response for pagination instead of computing them from the local array
  - Keep all existing UI components (`EventCard`, `FeaturedEventCard`, category filter buttons, pagination) unchanged
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 10.1, 10.3_

- [x] 12. Update EventAttendancePage.tsx to use real API
  - Replace `MOCK_EVENT` with state loaded from `eventService.getEventById(eventId)` in a `useEffect`
  - Replace `generateMockStudents()` with state loaded from `eventService.getStudentsForEvent(eventId, { grade, section })` in a `useEffect` that re-fetches when `gradeFilter` or `sectionFilter` changes
  - Wire the "Guardar Asistencia" button to call `eventService.saveEventAttendance(eventId, records)` (POST on first save, PUT on subsequent saves — track whether a record already exists via a `hasSavedRecord` state flag)
  - On successful save, update the `saved` state to `true` as before
  - On API error, display an error message near the save button
  - Keep all existing UI components (`AttendanceToggle`, `TutorToggle`, `TutorNameField`, `StatsCard`, table, pagination) unchanged
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 7.1, 7.3, 10.2, 10.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Run `yarn test` inside `backend/` and confirm all tests pass.
  - Verify TypeScript compiles without errors in both `backend/` (`yarn build`) and the frontend root (`npx tsc --noEmit`).
  - Ask the user if any questions arise before considering the implementation complete.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Property tests require `fast-check` to be installed (Task 1) before any `*` tasks can run
- Each property test references a specific property number from `design.md` for traceability
- The `upsertAttendanceRecord` service function uses `findOneAndReplace` with `{ upsert: true, new: true }` so both POST and PUT attendance routes converge to the same operation — this avoids "record already exists" conflicts
- The `attendeesCount` aggregation in `getEvents` uses a single pipeline after fetching the page to avoid N+1 queries
- Business rule validation (tutor/attendance consistency) lives in `eventAttendanceService.validateEntries`, not in Mongoose schema validators, to produce clear HTTP 400 responses
- The `protect` and `authorize` middleware are already implemented in `backend/src/middleware/authMiddleware.ts` — import them directly
- The frontend `api` axios instance in `src/services/api.ts` already handles JWT injection and 401 redirects — no changes needed there
