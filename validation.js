export function validateData(data, missingSheets = []) {
  const errors = [];
  const warnings = [];
  if (missingSheets.length) errors.push(`Missing required sheets: ${missingSheets.join(", ")}`);

  const checkRequired = (rows, idKey, label) => {
    const ids = new Set();
    rows.forEach((r, i) => {
      if (!r[idKey]) errors.push(`${label} row ${i + 2} missing ${idKey}`);
      if (ids.has(r[idKey])) errors.push(`${label} duplicate ${idKey}: ${r[idKey]}`);
      ids.add(r[idKey]);
    });
    return ids;
  };

  const teacherIds = checkRequired(data.teachers, "TeacherID", "Teachers");
  const roomIds = checkRequired(data.rooms, "RoomID", "Rooms");
  const batchIds = checkRequired(data.batches, "BatchID", "Batches");
  const courseIds = checkRequired(data.courses, "CourseID", "Courses");
  const slotIds = checkRequired(data.slots, "SlotID", "Slots");
  const dayIds = new Set(data.days.filter((d) => String(d.Enabled).toUpperCase() === "TRUE").map((d) => d.Day));

  data.courses.forEach((c) => {
    if (!teacherIds.has(c.TeacherID)) errors.push(`Course ${c.CourseID} has unknown TeacherID ${c.TeacherID}`);
    c.BatchIDsList.forEach((b) => { if (!batchIds.has(b)) errors.push(`Course ${c.CourseID} has unknown batch ${b}`); });
    if (!c.RoomType) warnings.push(`Course ${c.CourseID} has empty RoomType`);
  });

  data.fixedAssignments.forEach((f, i) => {
    if (!batchIds.has(f.BatchID)) errors.push(`FixedAssignments row ${i + 2} unknown BatchID ${f.BatchID}`);
    if (!courseIds.has(f.CourseID)) errors.push(`FixedAssignments row ${i + 2} unknown CourseID ${f.CourseID}`);
    if (!roomIds.has(f.RoomID)) errors.push(`FixedAssignments row ${i + 2} unknown RoomID ${f.RoomID}`);
    if (!dayIds.has(f.Day)) errors.push(`FixedAssignments row ${i + 2} invalid Day ${f.Day}`);
    if (!slotIds.has(f.SlotID)) errors.push(`FixedAssignments row ${i + 2} invalid SlotID ${f.SlotID}`);
  });

  data.blockedSlots.forEach((b, i) => {
    if (!["BATCH", "TEACHER", "ROOM"].includes(b.ScopeType)) errors.push(`BlockedSlots row ${i + 2} invalid ScopeType ${b.ScopeType}`);
    if (!dayIds.has(b.Day)) errors.push(`BlockedSlots row ${i + 2} invalid Day ${b.Day}`);
    if (!slotIds.has(b.SlotID)) errors.push(`BlockedSlots row ${i + 2} invalid SlotID ${b.SlotID}`);
  });

  return { errors, warnings, valid: errors.length === 0 };
}
