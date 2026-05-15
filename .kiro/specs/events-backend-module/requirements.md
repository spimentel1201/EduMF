# Requirements Document

## Introduction

This document defines the requirements for the **Events Backend Module** of EduMF, a school management system. The module provides a REST API that backs two existing frontend pages:

1. **EventsPage** — a catalog of school events with search, category filtering, pagination, and a featured event card.
2. **EventAttendancePage** — a per-event attendance registration page where staff mark each student as present/absent, record tutor presence (padre/madre/apoderado), and optionally enter the tutor's name (required only when the tutor type is "apoderado").

The backend is a Node.js/TypeScript Express application using Mongoose and MongoDB (consistent with all existing models in the project). The new module must follow the same architectural patterns already established: Mongoose models, Express controllers, route files, and service helpers.

---

## Glossary

- **Event**: A school activity (academic, cultural, sports, etc.) with a title, description, category, date, time range, location, and optional image URL.
- **EventCategory**: One of the five fixed values: `Académico`, `Artes`, `Deportes`, `Cultura`, `Otro`.
- **EventAttendanceRecord**: A document that stores the attendance state of all students for a specific event.
- **StudentAttendanceEntry**: A single student's attendance data within an EventAttendanceRecord, including attendance status, tutor presence type, and optional tutor name.
- **AttendanceStatus**: One of `present`, `absent`, or `null` (not yet recorded).
- **TutorPresence**: One of `padre`, `madre`, `apoderado`, or `null` (no tutor present).
- **API**: The Express REST API served at `/api`.
- **EventsAPI**: The subset of the API that handles event CRUD operations, served at `/api/events`.
- **EventAttendanceAPI**: The subset of the API that handles event attendance operations, served at `/api/events/:eventId/attendance`.
- **Staff**: An authenticated user with role `admin` or `teacher`.
- **Student**: A User document with role `student` enrolled in a Section.
- **Enrollment**: An existing Mongoose model linking a Student to a Section and SchoolYear.
- **Section**: An existing Mongoose model representing a class group (grade + section letter).

---

## Requirements

### Requirement 1: Event Model

**User Story:** As a developer, I want a well-defined Event data model, so that events can be stored and retrieved consistently.

#### Acceptance Criteria

1. THE EventsAPI SHALL store each event with the following fields: `title` (string, required), `description` (string, optional), `category` (one of `Académico`, `Artes`, `Deportes`, `Cultura`, `Otro`, required), `date` (Date, required), `timeStart` (string in HH:MM format, required), `timeEnd` (string in HH:MM format, required), `location` (string, required), `imageUrl` (string, optional), `featured` (boolean, default `false`), `scope` (one of `general`, `specific`, default `general`), `targetGrade` (string, optional), `targetSection` (string, optional), and `capacity` (number, optional).
2. THE EventsAPI SHALL automatically record `createdAt` and `updatedAt` timestamps on every Event document.
3. THE EventsAPI SHALL expose the MongoDB `_id` field as `id` in all JSON responses, omitting `_id` and `__v`.
4. THE EventsAPI SHALL enforce that `targetGrade` and `targetSection` are present WHEN `scope` is `specific`.

---

### Requirement 2: Event CRUD Operations

**User Story:** As a staff member, I want to create, read, update, and delete events, so that the event catalog stays accurate and up to date.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/events` with a valid body, THE EventsAPI SHALL create a new Event document and return it with HTTP 201.
2. WHEN a GET request is sent to `/api/events`, THE EventsAPI SHALL return a paginated list of events sorted by `date` ascending.
3. WHEN a GET request is sent to `/api/events/:id`, THE EventsAPI SHALL return the matching Event document or HTTP 404 if not found.
4. WHEN a PUT request is sent to `/api/events/:id` with a valid body, THE EventsAPI SHALL update the Event document and return the updated document.
5. WHEN a DELETE request is sent to `/api/events/:id`, THE EventsAPI SHALL delete the Event document and return HTTP 200 with an empty data object.
6. IF a required field is missing in a POST or PUT request body, THEN THE EventsAPI SHALL return HTTP 400 with a descriptive validation error message.
7. IF the `id` parameter in a GET, PUT, or DELETE request does not match any Event document, THEN THE EventsAPI SHALL return HTTP 404.

---

### Requirement 3: Event Catalog Filtering and Pagination

**User Story:** As a staff member, I want to search and filter the event catalog, so that I can quickly find relevant events.

#### Acceptance Criteria

1. WHEN a GET request to `/api/events` includes a `search` query parameter, THE EventsAPI SHALL return only events whose `title` or `description` contains the search string (case-insensitive).
2. WHEN a GET request to `/api/events` includes a `category` query parameter with a valid EventCategory value, THE EventsAPI SHALL return only events matching that category.
3. WHEN a GET request to `/api/events` includes a `featured` query parameter set to `true`, THE EventsAPI SHALL return only events where `featured` is `true`.
4. WHEN a GET request to `/api/events` includes `page` and `limit` query parameters, THE EventsAPI SHALL return the corresponding page of results and include `total`, `page`, `limit`, and `totalPages` in the response.
5. THE EventsAPI SHALL use a default `limit` of 10 and a default `page` of 1 WHEN those parameters are absent.
6. IF the `category` query parameter contains a value not in the EventCategory enum, THEN THE EventsAPI SHALL return HTTP 400.

---

### Requirement 4: Event Attendance Record Model

**User Story:** As a developer, I want a well-defined EventAttendanceRecord data model, so that per-event student attendance can be stored and retrieved consistently.

#### Acceptance Criteria

1. THE EventAttendanceAPI SHALL store each EventAttendanceRecord with the following fields: `eventId` (ObjectId reference to Event, required), `submittedBy` (ObjectId reference to User, required), `submittedAt` (Date), and `entries` (array of StudentAttendanceEntry).
2. THE EventAttendanceAPI SHALL store each StudentAttendanceEntry with: `studentId` (ObjectId reference to User, required), `attendance` (one of `present`, `absent`, `null`, required), `tutorPresence` (one of `padre`, `madre`, `apoderado`, `null`), and `tutorName` (string, optional).
3. THE EventAttendanceAPI SHALL enforce that `tutorName` is present WHEN `tutorPresence` is `apoderado`.
4. THE EventAttendanceAPI SHALL enforce that `tutorPresence` is `null` and `tutorName` is empty WHEN `attendance` is `absent`.
5. THE EventAttendanceAPI SHALL enforce a unique constraint on the combination of `eventId` and `studentId` within the `entries` array, so that each student appears at most once per event attendance record.

---

### Requirement 5: Retrieve Students for Event Attendance

**User Story:** As a staff member, I want to load the list of students for an event's attendance page, so that I can mark each student's attendance without manually entering names.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/events/:eventId/attendance/students`, THE EventAttendanceAPI SHALL return the list of enrolled students relevant to the event.
2. WHEN the Event's `scope` is `general`, THE EventAttendanceAPI SHALL return all active Students across all Sections in the active SchoolYear.
3. WHEN the Event's `scope` is `specific`, THE EventAttendanceAPI SHALL return only Students enrolled in the Section matching the event's `targetGrade` and `targetSection`.
4. THE EventAttendanceAPI SHALL return each student record with: `id`, `name` (formatted as `Apellido, Nombre`), `studentId` (the student's `dni` field), `grade`, and `section`.
5. WHEN a GET request is sent to `/api/events/:eventId/attendance/students` and the event does not exist, THE EventAttendanceAPI SHALL return HTTP 404.
6. THE EventAttendanceAPI SHALL support optional `grade` and `section` query parameters to filter the returned student list.

---

### Requirement 6: Save Event Attendance

**User Story:** As a staff member, I want to save the attendance records for an event, so that the data is persisted and can be reviewed later.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/events/:eventId/attendance` with a valid entries array, THE EventAttendanceAPI SHALL create or replace the EventAttendanceRecord for that event and return HTTP 201.
2. WHEN a PUT request is sent to `/api/events/:eventId/attendance` with a valid entries array, THE EventAttendanceAPI SHALL update the existing EventAttendanceRecord and return the updated document.
3. THE EventAttendanceAPI SHALL record the authenticated user's ID in `submittedBy` and the current timestamp in `submittedAt` on every save.
4. IF the `entries` array contains a `tutorPresence` of `apoderado` and `tutorName` is absent or empty, THEN THE EventAttendanceAPI SHALL return HTTP 400 with a descriptive error.
5. IF the `entries` array contains a `tutorPresence` that is not `null` and `attendance` is `absent`, THEN THE EventAttendanceAPI SHALL return HTTP 400 with a descriptive error.
6. IF the event referenced by `eventId` does not exist, THEN THE EventAttendanceAPI SHALL return HTTP 404.

---

### Requirement 7: Retrieve Saved Event Attendance

**User Story:** As a staff member, I want to retrieve the saved attendance for an event, so that I can review or continue editing it.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/events/:eventId/attendance`, THE EventAttendanceAPI SHALL return the EventAttendanceRecord for that event if it exists.
2. WHEN no EventAttendanceRecord exists for the given `eventId`, THE EventAttendanceAPI SHALL return HTTP 404.
3. THE EventAttendanceAPI SHALL populate each `studentId` in the entries with the student's `firstName`, `lastName`, and `dni` fields.
4. THE EventAttendanceAPI SHALL include summary statistics in the response: total students, present count, absent count, and tutor presence count.

---

### Requirement 8: Event Attendance Summary Statistics

**User Story:** As a staff member, I want to see summary statistics on the attendance page, so that I can quickly assess participation levels.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/events/:eventId/attendance/summary`, THE EventAttendanceAPI SHALL return: `totalStudents`, `presentCount`, `absentCount`, `notRecordedCount`, `tutorCount`, and `attendanceRate` (percentage, rounded to the nearest integer).
2. WHEN no EventAttendanceRecord exists for the given `eventId`, THE EventAttendanceAPI SHALL return the summary with all counts set to zero.
3. THE EventAttendanceAPI SHALL compute `attendanceRate` as `round((presentCount / totalStudents) * 100)`, treating division by zero as 0%.

---

### Requirement 9: Authentication and Authorization

**User Story:** As a system administrator, I want all event and attendance endpoints to require authentication, so that only authorized staff can manage events and attendance data.

#### Acceptance Criteria

1. THE EventsAPI SHALL require a valid Bearer JWT token on all routes except GET `/api/events` and GET `/api/events/:id`.
2. THE EventAttendanceAPI SHALL require a valid Bearer JWT token on all routes.
3. IF a request to a protected route does not include a valid Bearer JWT token, THEN THE EventsAPI SHALL return HTTP 401.
4. WHEN a DELETE request is sent to `/api/events/:id`, THE EventsAPI SHALL require the authenticated user to have the `admin` role and return HTTP 403 if the role is insufficient.
5. WHEN a POST or PUT request is sent to `/api/events`, THE EventsAPI SHALL require the authenticated user to have the `admin` or `teacher` role and return HTTP 403 if the role is insufficient.

---

### Requirement 10: Frontend Integration — Events Service

**User Story:** As a frontend developer, I want a typed API service module for events, so that the EventsPage and EventAttendancePage can replace their mock data with real API calls.

#### Acceptance Criteria

1. THE EventsAPI SHALL accept and return data in a shape compatible with the `Event` interface used in `EventsPage.tsx`: `id`, `title`, `description`, `category`, `date` (ISO string), `timeStart`, `timeEnd`, `location`, `imageUrl`, `attendeesCount`, `featured`.
2. THE EventAttendanceAPI SHALL accept and return data in a shape compatible with the `StudentRecord` interface used in `EventAttendancePage.tsx`: `id`, `name`, `studentId`, `grade`, `section`, `attendance`, `tutorPresence`, `tutorName`.
3. THE EventsAPI SHALL include an `attendeesCount` field in the event list response, computed as the number of students marked `present` in the event's EventAttendanceRecord (or 0 if no record exists).
4. WHEN the frontend sends a save request, THE EventAttendanceAPI SHALL accept the full entries array in a single request body rather than requiring one request per student.

---

### Requirement 11: Error Handling and Consistency

**User Story:** As a developer, I want all event endpoints to follow the same error response format as the rest of the API, so that the frontend can handle errors uniformly.

#### Acceptance Criteria

1. THE EventsAPI SHALL use the existing `ApiError` middleware class for all error responses.
2. THE EventsAPI SHALL return all error responses in the format `{ success: false, error: "<message>" }`.
3. THE EventsAPI SHALL return all success responses in the format `{ success: true, data: <payload> }`.
4. WHEN an unhandled exception occurs in any event or attendance route handler, THE EventsAPI SHALL pass the error to the Express `next` function so the global error handler processes it.
