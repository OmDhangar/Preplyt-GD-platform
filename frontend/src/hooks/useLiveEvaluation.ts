import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { apiPatch, apiGet, apiPost } from "@/lib/api";
import type {
  Evaluation,
  TemplateField,
  FieldValueEntry,
} from "@/lib/types";
import { calculateEvaluationScore, fieldValuesArrayToMap } from "@/lib/rubric";
import { userId } from "@/lib/evaluation-utils";
import type { PresenceUser } from "@/components/brand/PresenceStrip";
import type { SaveStatus } from "@/components/brand/SaveStatusIndicator";

type Buffer = Record<
  string,
  Record<string, { value: unknown; scoredAt: string; deviceLabel: string }>
>;

const deviceLabel =
  typeof window !== "undefined"
    ? `Web — ${navigator.platform || "Browser"}`
    : "Web";

export function useLiveEvaluation(sessionId: string, fields: TemplateField[]) {
  // values[studentId][fieldId] = value (mirrored from server + local edits)
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>(
    {},
  );
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  const bufferRef = useRef<Buffer>({});
  const flushingRef = useRef(false);

  // initial load: server evaluations
  useEffect(() => {
    let cancelled = false;
    apiGet<{ evaluations: Evaluation[]; byStudentId: Record<string, Evaluation>; total: number }>(
      `/evaluations/sessions/${sessionId}/evaluations`,
    )
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, Record<string, unknown>> = {};
        (data.evaluations || []).forEach((ev) => {
          map[userId(ev.studentId)] = {
            ...fieldValuesArrayToMap(ev.fieldValues),
            overallComment: ev.overallComment || "",
          };
        });
        setValues(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // socket setup
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      socket.emit("session:join", { sessionId });
      // replay buffer if any
      const buf = bufferRef.current;
      const updates = Object.entries(buf).map(([studentId, fields]) => ({
        studentId,
        fieldValues: Object.entries(fields).map(([fieldId, v]) => ({
          fieldId,
          value: v.value,
          scoredAt: v.scoredAt,
          deviceLabel: v.deviceLabel,
        })),
      }));
      if (updates.length) {
        socket.emit("eval:syncDirty", { sessionId, updates });
      }
      setStatus("saved");
    };

    const onDisconnect = () => setStatus("offline");

    const onJoinAck = (data: {
      sessionId: string;
      sessionStatus: string;
      presence: PresenceUser[];
    }) => {
      setSessionStatus(data.sessionStatus);
      setPresence(data.presence || []);
    };

    const onFieldUpdated = (msg: {
      studentId: string;
      fieldId: string;
      value: unknown;
      scoredAt: string;
    }) => {
      // LWW by scoredAt — accept since broadcast
      setValues((prev) => ({
        ...prev,
        [msg.studentId]: {
          ...(prev[msg.studentId] || {}),
          [msg.fieldId]: msg.value,
        },
      }));
    };

    const onParticipantJoined = (u: PresenceUser) => {
      setPresence((prev) => {
        if (prev.find((p) => p.userId === u.userId)) return prev;
        return [...prev, u];
      });
    };

    const onSessionStarted = () => setSessionStatus("active");
    const onSessionEnded = () => setSessionStatus("completed");

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("session:joinAck", onJoinAck);
    socket.on("eval:fieldUpdated", onFieldUpdated);
    socket.on("session:participantJoined", onParticipantJoined);
    socket.on("session:started", onSessionStarted);
    socket.on("session:ended", onSessionEnded);

    return () => {
      socket.emit("session:leave", { sessionId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("session:joinAck", onJoinAck);
      socket.off("eval:fieldUpdated", onFieldUpdated);
      socket.off("session:participantJoined", onParticipantJoined);
      socket.off("session:started", onSessionStarted);
      socket.off("session:ended", onSessionEnded);
    };
  }, [sessionId]);

  // 5s flush loop
  useEffect(() => {
    const id = setInterval(() => {
      void flush();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const flush = useCallback(async (): Promise<"saved" | "empty" | "error"> => {
    if (flushingRef.current) return "empty";
    const buf = bufferRef.current;
    const studentIds = Object.keys(buf);
    if (!studentIds.length) return "empty";
    flushingRef.current = true;
    setStatus("saving");
    // snapshot then optimistic clear
    const snapshot: Buffer = JSON.parse(JSON.stringify(buf));
    bufferRef.current = {};
    try {
      const updates = studentIds.map((studentId) => {
        const fieldValues: any[] = [];
        let overallComment: string | undefined;

        Object.entries(snapshot[studentId]).forEach(([fieldId, v]) => {
          if (fieldId === "overallComment") {
            overallComment = v.value as string;
          } else {
            fieldValues.push({
              fieldId,
              value: v.value,
              scoredAt: v.scoredAt,
              deviceLabel: v.deviceLabel,
            });
          }
        });

        return {
          studentId,
          fieldValues,
          overallComment,
        };
      });
      await apiPatch("/evaluations/batch", { sessionId, updates });
      setStatus("saved");
      return "saved";
    } catch {
      // restore
      const merged = { ...snapshot };
      Object.entries(bufferRef.current).forEach(([sid, fmap]) => {
        merged[sid] = { ...(merged[sid] || {}), ...fmap };
      });
      bufferRef.current = merged;
      setStatus("retrying");
      return "error";
    } finally {
      flushingRef.current = false;
    }
  }, [sessionId]);

  const onFieldChange = useCallback(
    (studentId: string, fieldId: string, value: unknown) => {
      const scoredAt = new Date().toISOString();
      setValues((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [fieldId]: value },
      }));
      bufferRef.current = {
        ...bufferRef.current,
        [studentId]: {
          ...(bufferRef.current[studentId] || {}),
          [fieldId]: { value, scoredAt, deviceLabel },
        },
      };
      setStatus("saving");
      const socket = getSocket();
      if (socket.connected) {
        socket.emit("eval:fieldUpdate", {
          sessionId,
          studentId,
          fieldId,
          value,
          scoredAt,
          deviceLabel,
        });
      }
    },
    [sessionId],
  );

  const computedScore = useCallback(
    (studentId: string) =>
      calculateEvaluationScore(fields, values[studentId] || {}),
    [fields, values],
  );

  const submitOne = useCallback(
    async (studentId: string) => {
      await flush();
      await apiPatch(
        `/evaluations/sessions/${sessionId}/evaluations/${studentId}/submit`,
      );
    },
    [flush, sessionId],
  );

  const publishAll = useCallback(async () => {
    await flush();
    await apiPost(`/evaluations/sessions/${sessionId}/evaluations/publish`);
  }, [flush, sessionId]);

  return {
    values,
    presence,
    status,
    sessionStatus,
    onFieldChange,
    computedScore,
    flushNow: flush,
    submitOne,
    publishAll,
  };
}

export type _LiveEvalFieldValue = FieldValueEntry;
