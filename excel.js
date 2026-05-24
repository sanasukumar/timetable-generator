const REQUIRED_SHEETS = ["Slots","Days","Teachers","Rooms","Batches","Courses","BlockedSlots","FixedAssignments","Constraints","SchedulingOrder"];

function normalizeRows(rows) {
  return rows.filter((r) => Object.values(r).some((v) => v !== "" && v != null));
}

export function parseWorkbook(workbook) {
  const missingSheets = REQUIRED_SHEETS.filter((name) => !workbook.SheetNames.includes(name));
  const sheets = {};
  for (const name of REQUIRED_SHEETS) {
    const ws = workbook.Sheets[name];
    sheets[name] = ws ? normalizeRows(XLSX.utils.sheet_to_json(ws, { defval: "" })) : [];
  }

  const data = {
    slots: sheets.Slots,
    days: sheets.Days,
    teachers: sheets.Teachers,
    rooms: sheets.Rooms,
    batches: sheets.Batches,
    courses: sheets.Courses.map((c) => ({ ...c, BatchIDsList: String(c.BatchIDs || "").split(",").map((x) => x.trim()).filter(Boolean) })),
    blockedSlots: sheets.BlockedSlots,
    fixedAssignments: sheets.FixedAssignments,
    constraints: sheets.Constraints,
    schedulingOrder: sheets.SchedulingOrder,
  };

  return { data, missingSheets };
}

export function readWorkbookFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(XLSX.read(e.target.result, { type: "array" }));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function readWorkbookFromUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return XLSX.read(await blob.arrayBuffer(), { type: "array" });
}
