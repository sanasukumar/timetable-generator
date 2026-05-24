export function exportTimetable({ schedule, data }) {
  const wb = XLSX.utils.book_new();
  for (const batch of data.batches) {
    const rows = [];
    for (const day of data.days.filter((d) => String(d.Enabled).toUpperCase() === "TRUE")) {
      for (const slot of data.slots) {
        const cell = schedule[batch.BatchID]?.[day.Day]?.[slot.SlotID];
        rows.push({
          BatchID: batch.BatchID,
          Day: day.Day,
          SlotID: slot.SlotID,
          CourseID: cell?.courseId || "",
          CourseName: cell?.courseName || "",
          TeacherID: cell?.teacherId || "",
          RoomID: cell?.roomId || "",
        });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), batch.BatchID.slice(0, 31));
  }
  XLSX.writeFile(wb, "generated_timetable.xlsx");
}
