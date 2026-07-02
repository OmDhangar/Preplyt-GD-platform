import type { Evaluation, Participant, TemplateField, User } from "@/lib/types";

export function userId(value: string | User | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id;
}

export function userName(value: string | User | undefined, fallback = "Unknown") {
  if (!value || typeof value === "string") return fallback;
  return value.name || fallback;
}

export function userEmail(value: string | User | undefined) {
  if (!value || typeof value === "string") return "";
  return value.email || "";
}

export function evaluationValueMap(record?: Evaluation) {
  const map: Record<string, unknown> = {};
  (record?.fieldValues || []).forEach((field) => {
    map[field.fieldId] = field.value;
  });
  return map;
}

export function missingRequiredFields(fields: TemplateField[], record?: Evaluation) {
  const values = evaluationValueMap(record);
  return fields.filter((field) => {
    if (!field.required) return false;
    const value = values[field.fieldId];
    return value === undefined || value === null || value === "";
  });
}

export function statusTone(status?: Evaluation["status"]) {
  if (status === "published") return "teal";
  if (status === "submitted") return "amber";
  return "dark";
}

export function participantStudentId(participant: Participant) {
  return participant.userId || participant._id || "";
}
