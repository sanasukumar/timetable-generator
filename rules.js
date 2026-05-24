export const RULE_HANDLERS = {
  PLACE_FIXED_ASSIGNMENTS: "placeFixedAssignments",
  PLACE_LABS: "placeLabs",
  PLACE_SHARED: "placeShared",
  PLACE_CORE: "placeCore",
  PLACE_THEORY: "placeTheory",
  BALANCE_LOAD: "balanceLoad",
};

export function buildCourseQueues(data) {
  const byType = { labs: [], shared: [], core: [], theory: [] };
  for (const course of data.courses) {
    if (course.BatchIDsList.length > 1) byType.shared.push(course);
    else if (String(course.CourseType).toUpperCase() === "LAB") byType.labs.push(course);
    else if (String(course.Priority).toUpperCase() === "CORE") byType.core.push(course);
    else byType.theory.push(course);
  }
  return byType;
}
