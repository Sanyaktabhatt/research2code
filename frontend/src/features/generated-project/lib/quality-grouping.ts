import type { QualityIssue } from "@/types/domain";

export interface QualityGroup {
  id: string;
  label: string;
  description: string;
  issues: QualityIssue[];
}

/**
 * `QualityIssue.category` is free-text set by the validator (see
 * backend/app/codegen/validator.py) - not an enum - so this maps the exact
 * strings it actually emits into the report's named sections. "Broken
 * imports" mirrors the validator's own class docstring ("Automated review
 * of a generated project: missing files, broken imports, unresolved
 * template placeholders, and dependency issues"), which is the closest
 * real check to that label (a Python `ast.parse` syntax check).
 */
const GROUP_DEFINITIONS: { id: string; label: string; description: string; categories: string[] }[] = [
  {
    id: "missing_files",
    label: "Missing files",
    description: "Required files or directories the generator did not produce",
    categories: ["missing_file", "missing_directory"],
  },
  {
    id: "broken_imports",
    label: "Broken imports",
    description: "Python files that failed to parse",
    categories: ["syntax_error"],
  },
  {
    id: "unresolved_placeholders",
    label: "Unresolved placeholders",
    description: "Unrendered template markers left in generated output",
    categories: ["unresolved_placeholder"],
  },
  {
    id: "dependency_issues",
    label: "Dependency issues",
    description: "Imports that aren't stdlib, project-local, or declared in requirements.txt",
    categories: ["dependency_issue"],
  },
  {
    id: "config_issues",
    label: "Configuration issues",
    description: "Invalid config.yaml",
    categories: ["invalid_config"],
  },
  {
    id: "warnings",
    label: "Warnings",
    description: "Non-blocking follow-ups",
    categories: ["todo_marker"],
  },
];

export function groupQualityIssues(issues: QualityIssue[]): QualityGroup[] {
  return GROUP_DEFINITIONS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    issues: issues.filter((issue) => def.categories.includes(issue.category)),
  }));
}

/** Groups with zero issues - real "this check passed clean" signal, not fabricated. */
export function passedChecks(groups: QualityGroup[]): QualityGroup[] {
  return groups.filter((group) => group.issues.length === 0);
}

const ERROR_PENALTY = 0.15;
const WARNING_PENALTY = 0.05;

/** Same scoring formula as backend/app/codegen/validator.py::_score, applied to one file's issues for the Context Inspector's per-file quality score. */
export function fileQualityScore(issues: QualityIssue[], filePath: string): number {
  const penalty = issues
    .filter((issue) => issue.file_path === filePath)
    .reduce((sum, issue) => sum + (issue.severity === "error" ? ERROR_PENALTY : WARNING_PENALTY), 0);
  return Math.max(0, Math.min(1, 1 - penalty));
}
