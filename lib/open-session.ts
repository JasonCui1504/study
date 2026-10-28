import { one } from "./db";
import type { OpenSession } from "../app/components/StudySession";

/** The open study session with its task's title, for the header and dashboard. */
export function getOpenSession(): Promise<OpenSession | null> {
  return one<OpenSession>(
    `SELECT s.id, s.started_at, s.section, s.topic_id, s.task_id, s.notes, t.title AS task_title
     FROM sessions s LEFT JOIN tasks t ON t.id = s.task_id WHERE s.ended_at IS NULL ORDER BY s.id DESC LIMIT 1`
  );
}
