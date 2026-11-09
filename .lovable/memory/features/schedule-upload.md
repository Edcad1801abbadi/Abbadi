---
name: Student Schedule Upload
description: XLSX upload into student_schedules table, surfaced on Map tab as Student per car
type: feature
---
- Table `public.student_schedules` (car_number, student_name, session_number, start_time, end_time, schedule_date) with permissive RLS (anon read/insert/delete) — matches the app's anon-only auth model.
- Settings tab → `ScheduleUpload.tsx` parses .xlsx via the `xlsx` package. Column aliases support both English and Arabic headers (e.g. "Car Number"/"رقم السيارة", "Student Name"/"اسم الطالب").
- Excel time fractions and date serials are converted via `XLSX.SSF.parse_date_code`.
- `useStudentSchedules(date)` hook fetches today's rows; `findStudentForCar(rows, carNumber, nowMin)` returns the matching student. Used by Map tab to show student per vehicle.
