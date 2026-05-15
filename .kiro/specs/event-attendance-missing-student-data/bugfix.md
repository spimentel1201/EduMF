# Bugfix Requirements Document

## Introduction

When navigating to the Event Attendance page (`EventAttendancePage`) for an event that already has a previously saved attendance record, the existing entries are displayed without student names, student ID numbers, or tutor information. Each row shows only "ID" as a placeholder and the attendance/tutor toggle buttons, but the student name column is blank (showing only the avatar initials placeholder). Students who were not previously recorded appear correctly with full names at the bottom of the list. This bug affects any user who returns to take or review attendance for an event after at least one attendance record has been saved.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to the attendance page for an event that already has a saved attendance record THEN the system displays each previously recorded entry with an empty student name field (showing only the avatar initials placeholder derived from an empty string).

1.2 WHEN a user navigates to the attendance page for an event that already has a saved attendance record THEN the system displays "ID: " with no actual student ID number for each previously recorded entry.

1.3 WHEN the frontend maps the saved attendance record entries returned by the API THEN the system uses `entry.studentId?.lastName` and `entry.studentId?.firstName` to build the name, but these fields are absent because the populated `studentId` object is not being returned or recognized correctly, resulting in an empty name string.

1.4 WHEN the frontend maps the saved attendance record entries returned by the API THEN the system uses `entry.studentId?.dni` to populate the student ID number, but this field is absent, resulting in an empty student ID.

### Expected Behavior (Correct)

2.1 WHEN a user navigates to the attendance page for an event that already has a saved attendance record THEN the system SHALL display each previously recorded entry with the student's full name in "Apellido, Nombre" format.

2.2 WHEN a user navigates to the attendance page for an event that already has a saved attendance record THEN the system SHALL display the correct student ID number (DNI) for each previously recorded entry.

2.3 WHEN the frontend maps the saved attendance record entries returned by the API THEN the system SHALL correctly read the populated student fields (`firstName`, `lastName`, `dni`) from the `studentId` object in each entry to build the display name and student ID.

2.4 WHEN the frontend maps the saved attendance record entries returned by the API THEN the system SHALL use the student's MongoDB `_id` (from the populated `studentId` object) as the record's `id` field, so that subsequent saves correctly reference the student.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user navigates to the attendance page for an event that has NO previously saved attendance record THEN the system SHALL CONTINUE TO display all enrolled students with their full names and student IDs loaded from the fresh student list.

3.2 WHEN a user saves attendance for the first time for an event THEN the system SHALL CONTINUE TO create a new attendance record with all student entries correctly persisted.

3.3 WHEN a user updates an already-saved attendance record THEN the system SHALL CONTINUE TO persist the updated attendance statuses, tutor presence, and tutor names correctly.

3.4 WHEN the attendance page displays students from a fresh (unsaved) load THEN the system SHALL CONTINUE TO show correct names, student IDs, grade, and section information for all enrolled students.

3.5 WHEN a student's attendance status is set to "absent" THEN the system SHALL CONTINUE TO clear tutor presence and tutor name fields for that student.
