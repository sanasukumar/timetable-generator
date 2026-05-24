export function renderGrid({ container, schedule, batchId, days, slots }) {
  if (!schedule?.[batchId]) { container.innerHTML = "<p class='text-sm text-slate-600'>No timetable generated yet.</p>"; return; }
  const head = slots.map((s) => `<th>${s.SlotID}<br><span class='text-xs text-slate-500'>${s.Start}-${s.End}</span></th>`).join("");
  const rows = days.map((d) => {
    const tds = slots.map((s) => {
      const cell = schedule[batchId][d.Day][s.SlotID];
      if (!cell) return "<td></td>";
      return `<td><div class='course-chip'><div class='font-semibold'>${cell.courseId}</div><div>${cell.courseName}</div><div class='text-xs text-slate-600'>${cell.teacherId} • ${cell.roomId}</div></div></td>`;
    }).join("");
    return `<tr><th>${d.Day}</th>${tds}</tr>`;
  }).join("");
  container.innerHTML = `<table class='grid-table'><thead><tr><th>Day / Slot</th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}
