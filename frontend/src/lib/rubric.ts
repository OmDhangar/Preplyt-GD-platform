import type { TemplateField } from "./types";

export function calculateEvaluationScore(
  templateFields: TemplateField[],
  fieldValues: Record<string, unknown>,
) {
  let totalScore = 0;
  let maxPossibleScore = 0;
  templateFields.forEach((field) => {
    const value = fieldValues[field.fieldId];
    if (value == null) return;
    if (field.type === "weighted_score") {
      totalScore += Number(value) * (field.weight || 1);
      maxPossibleScore += (field.maxScore || 10) * (field.weight || 1);
    } else if (field.type === "number") {
      totalScore += Number(value);
      maxPossibleScore += field.max || 10;
    }
  });
  const percentScore =
    maxPossibleScore > 0
      ? +((totalScore / maxPossibleScore) * 100).toFixed(2)
      : 0;
  return {
    totalScore: +totalScore.toFixed(2),
    maxScore: +maxPossibleScore.toFixed(2),
    percentScore,
  };
}

export function fieldValuesArrayToMap(
  arr: { fieldId: string; value: unknown }[] | undefined,
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  (arr || []).forEach((e) => {
    map[e.fieldId] = e.value;
  });
  return map;
}
