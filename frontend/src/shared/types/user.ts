export interface TeacherCertificate {
  id: number;
  title: string;
  issuer?: string | null;
  year?: string | null;
  description?: string | null;
  documentUrl?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  teacherHeadline?: string | null;
  teacherBio?: string | null;
  teacherResume?: string | null;
  teacherCertificates?: TeacherCertificate[];
  teacherIntroVideoUrl?: string | null;
  hourlyRate?: number | null;
  teachesLanguages?: string | null;
  showInTeacherDirectory?: boolean | null;
  /** ISO 639-1 target language the user is learning. */
  learningLanguage?: string | null;
  /** Shown on teacher profile / directory — how cancellations work. */
  teacherCancellationPolicy?: string | null;
  /** Pay outside Lexora — bank details, PayPal, etc. */
  teacherPaymentInfo?: string | null;
  offersTrialLesson?: boolean | null;
  cefrLevel?: string | null;
  learningGoalType?: string | null;
  learningGoalWeeks?: number | null;
  learningGoalNotes?: string | null;
}
