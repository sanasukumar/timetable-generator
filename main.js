import { readWorkbookFromFile, readWorkbookFromUrl, parseWorkbook } from "./excel.js";
import { validateData } from "./validation.js";
import { generateTimetable } from "./scheduler.js";
import { renderGrid } from "./grid.js";
import { exportTimetable } from "./export.js";

const els = {
  workbookInput: document.getElementById("workbookInput"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  fileStatus: document.getElementById("fileStatus"),
  validationSummary: document.getElementById("validationSummary"),
  generateBtn: document.getElementById("generateBtn"),
  batchSelect: document.getElementById("batchSelect"),
  gridContainer: document.getElementById("gridContainer"),
  failuresList: document.getElementById("failuresList"),
  exportBtn: document.getElementById("exportBtn"),
};

const state = { data: null, validation: null, schedule: null, failures: [] };

async function loadWorkbook(workbook, label) {
  const { data, missingSheets } = parseWorkbook(workbook);
  const validation = validateData(data, missingSheets);
  state.data = data;
  state.validation = validation;
  state.schedule = null;
  state.failures = [];

  els.fileStatus.textContent = `${label} loaded.`;
  els.validationSummary.innerHTML = `<p><strong>${validation.valid ? "Valid" : "Invalid"}</strong></p>
    <p>Errors: ${validation.errors.length} | Warnings: ${validation.warnings.length}</p>
    ${validation.errors.length ? `<details><summary>Errors</summary><ul>${validation.errors.map((e) => `<li>${e}</li>`).join("")}</ul></details>` : ""}
    ${validation.warnings.length ? `<details><summary>Warnings</summary><ul>${validation.warnings.map((w) => `<li>${w}</li>`).join("")}</ul></details>` : ""}`;

  els.generateBtn.disabled = !validation.valid;
  els.batchSelect.disabled = true;
  els.exportBtn.disabled = true;
  els.gridContainer.innerHTML = "";
  els.failuresList.innerHTML = "";
}

els.workbookInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const wb = await readWorkbookFromFile(file);
  await loadWorkbook(wb, file.name);
});

els.loadSampleBtn.addEventListener("click", async () => {
  const wb = await readWorkbookFromUrl("./sample-data/timetable_scheduler_master_config_v4.xlsx");
  await loadWorkbook(wb, "sample workbook");
});

els.generateBtn.addEventListener("click", () => {
  const { schedule, failures } = generateTimetable(state.data);
  state.schedule = schedule;
  state.failures = failures;

  els.batchSelect.innerHTML = state.data.batches.map((b) => `<option value='${b.BatchID}'>${b.BatchID} - ${b.BatchName}</option>`).join("");
  els.batchSelect.disabled = false;
  els.exportBtn.disabled = false;
  renderGrid({ container: els.gridContainer, schedule: state.schedule, batchId: state.data.batches[0]?.BatchID, days: state.data.days.filter((d) => String(d.Enabled).toUpperCase() === "TRUE"), slots: state.data.slots });

  els.failuresList.innerHTML = failures.length ? failures.map((f) => `<li>${f}</li>`).join("") : "<li class='text-green-700'>No scheduling failures.</li>";
});

els.batchSelect.addEventListener("change", () => {
  renderGrid({ container: els.gridContainer, schedule: state.schedule, batchId: els.batchSelect.value, days: state.data.days.filter((d) => String(d.Enabled).toUpperCase() === "TRUE"), slots: state.data.slots });
});

els.exportBtn.addEventListener("click", () => exportTimetable({ schedule: state.schedule, data: state.data }));
