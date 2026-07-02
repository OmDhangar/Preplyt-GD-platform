export type Role = "student" | "instructor" | "admin";

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isVerified?: boolean;
  verificationStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  isBlacklisted?: boolean;
  googleConnected?: boolean;
  profile?: Record<string, unknown>;
}

export type FieldType =
  | "number"
  | "weighted_score"
  | "select"
  | "multi_select"
  | "boolean"
  | "text";

export interface TemplateField {
  fieldId: string;
  label: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  visibleToStudent?: boolean;
  // numeric
  min?: number;
  max?: number;
  step?: number;
  // weighted_score
  weight?: number;
  maxScore?: number;
  // select / multi_select
  options?: string[];
}

export interface Template {
  _id: string;
  name: string;
  description?: string;
  status: "draft" | "published" | "archived";
  version?: number;
  fields: TemplateField[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SessionStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "published";

export interface Participant {
  _id?: string;
  userId: string;
  name?: string;
  email?: string;
  paymentStatus?: "pending" | "paid" | "not_required";
  joinedAt?: string;
}

export interface Attachment {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: string | { _id: string; name: string; email: string };
  uploadedAt?: string;
}

export interface Session {
  _id: string;
  title: string;
  description?: string;
  status: SessionStatus;
  templateId: string | Template;
  joinCode?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  publishedAt?: string;
  requiresPayment?: boolean;
  price?: number;
  currency?: string;
  googleMeetUrl?: string;
  participants?: Participant[];
  participantCount?: number;
  evaluatedCount?: number;
  sessionFee?: {
    amount: number;
    currency: string;
  };
  topic?: string;
  durationMins?: number;
  instructorId?: any;
  coInstructors?: User[];
  tags?: string[];
  createdBy?: string | User;
  attachments?: Attachment[];
  reminderSent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldValueEntry {
  fieldId: string;
  value: unknown;
  scoredAt?: string;
  deviceLabel?: string;
}

export interface Evaluation {
  _id?: string;
  sessionId: string;
  studentId: string | User;
  instructorId?: string | User;
  templateId?: string | Template;
  templateVersion?: number;
  fieldValues: FieldValueEntry[];
  totalScore?: number;
  maxScore?: number;
  percentScore?: number;
  status?: "draft" | "submitted" | "published";
  overallComment?: string;
  submittedAt?: string;
  publishedAt?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  details?: { field: string; message: string }[];
}
