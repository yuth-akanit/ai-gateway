export type NormalizedResult = {
  text: string;
  format: "markdown" | "json" | "code" | "text";
  parsed?: any;
};

export function normalizeOutput(taskType: string, rawText: string): NormalizedResult {
  const trimmedText = (rawText || "").trim();

  switch (taskType) {
    case "project_qa":
    case "automation_brainstorm":
    case "n8n_workflow_design":
      return { text: trimmedText, format: "markdown" };
    case "sql_schema_design":
      return { text: trimmedText, format: "code" };
    default:
      if (trimmedText.startsWith("{") && trimmedText.endsWith("}")) {
        try {
            const parsed = JSON.parse(trimmedText);
            return { text: trimmedText, format: "json", parsed };
        } catch (e) {}
      }
      return { text: trimmedText, format: "text" };
  }
}
