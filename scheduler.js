import { RULE_HANDLERS, buildCourseQueues } from "./rules.js";

export function generateTimetable(data) {
  const enabledDays = data.days.filter((d) => String(d.Enabled).toUpperCase() === "TRUE").map((d) => d.Day);
  const slotIds = data.slots.map((s) => s.SlotID);
  const schedule = {};
  const failures = [];
  const roomTypeMap = Object.fromEntries(data.rooms.map((r) => [r.RoomID, r]));
  const courseMap = Object.fromEntries(data.courses.map((c) => [c.CourseID, c]));

  data.batches.forEach((b) => {
    schedule[b.BatchID] = {};
    enabledDays.forEach((d) => {
      schedule[b.BatchID][d] = {};
      slotIds.forEach((s) => (schedule[b.BatchID][d][s] = null));
    });
  });

  const state = { data, schedule, enabledDays, slotIds, failures, roomTypeMap, courseMap };
  const orderedRules = [...data.schedulingOrder].filter((r) => String(r.Enabled).toUpperCase() === "TRUE").sort((a, b) => Number(a.Priority) - Number(b.Priority));
  const queues = buildCourseQueues(data);

  for (const rule of orderedRules) {
    const fn = RULE_HANDLERS[rule.Rule];
    if (!fn || !handlers[fn]) continue;
    handlers[fn](state, queues);
  }

  return { schedule, failures };
}

function canPlace(state, batchIds, teacherId, roomId, day, slotIndex, consecutive) {
  const slots = state.slotIds.slice(slotIndex, slotIndex + consecutive);
  if (slots.length < consecutive) return false;
  for (const slotId of slots) {
    for (const batchId of batchIds) {
      if (state.schedule[batchId][day][slotId]) return false;
      if (state.data.blockedSlots.some((b) => b.ScopeType === "BATCH" && b.ScopeID === batchId && b.Day === day && b.SlotID === slotId)) return false;
    }
    if (state.data.blockedSlots.some((b) => b.ScopeType === "TEACHER" && b.ScopeID === teacherId && b.Day === day && b.SlotID === slotId)) return false;
    if (state.data.blockedSlots.some((b) => b.ScopeType === "ROOM" && b.ScopeID === roomId && b.Day === day && b.SlotID === slotId)) return false;

    for (const batchId of Object.keys(state.schedule)) {
      const existing = state.schedule[batchId][day][slotId];
      if (!existing) continue;
      if (existing.teacherId === teacherId || existing.roomId === roomId) return false;
    }
  }
  return true;
}

function place(state, course, batchIds, day, slotIndex, roomId) {
  const consecutive = Number(course.ConsecutiveSlotsRequired || 1);
  const slots = state.slotIds.slice(slotIndex, slotIndex + consecutive);
  slots.forEach((slotId) => {
    batchIds.forEach((batchId) => {
      state.schedule[batchId][day][slotId] = { courseId: course.CourseID, courseName: course.CourseName, teacherId: course.TeacherID, roomId };
    });
  });
}

function pickRoom(state, course) {
  const match = state.data.rooms.find((r) => String(r.RoomType).toUpperCase() === String(course.RoomType).toUpperCase());
  return match ? match.RoomID : state.data.rooms[0]?.RoomID;
}

function placeCourseHours(state, course) {
  let hours = Number(course.HoursPerWeek || 0);
  const consecutive = Number(course.ConsecutiveSlotsRequired || 1);
  const batchIds = course.BatchIDsList;
  while (hours > 0) {
    let placed = false;
    for (const day of state.enabledDays) {
      for (let i = 0; i < state.slotIds.length; i++) {
        const roomId = pickRoom(state, course);
        if (canPlace(state, batchIds, course.TeacherID, roomId, day, i, consecutive)) {
          place(state, course, batchIds, day, i, roomId);
          hours -= consecutive;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      state.failures.push(`Unable to place ${course.CourseID} for remaining ${hours} slot(s)`);
      break;
    }
  }
}

const handlers = {
  placeFixedAssignments(state) {
    for (const fx of state.data.fixedAssignments) {
      const course = state.courseMap[fx.CourseID];
      if (!course) { state.failures.push(`Missing course in fixed assignment: ${fx.CourseID}`); continue; }
      const idx = state.slotIds.indexOf(fx.SlotID);
      if (idx < 0 || !canPlace(state, [fx.BatchID], course.TeacherID, fx.RoomID, fx.Day, idx, 1)) {
        state.failures.push(`Failed fixed assignment ${fx.BatchID} ${fx.Day} ${fx.SlotID} ${fx.CourseID}`);
        continue;
      }
      place(state, course, [fx.BatchID], fx.Day, idx, fx.RoomID);
    }
  },
  placeLabs(state, queues) { queues.labs.forEach((c) => placeCourseHours(state, c)); },
  placeShared(state, queues) { queues.shared.forEach((c) => placeCourseHours(state, c)); },
  placeCore(state, queues) { queues.core.forEach((c) => placeCourseHours(state, c)); },
  placeTheory(state, queues) { queues.theory.forEach((c) => placeCourseHours(state, c)); },
  balanceLoad() {},
};
