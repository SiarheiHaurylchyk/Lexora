/**
 * Backend sends User.role as a string (USER, TEACHER, ADMIN, PREMIUM).
 * Teacher-only UI uses this helper — same idea as Google Classroom (teacher vs student).
 */

export function userCanTeach(role: string | undefined): boolean {
  return role === 'TEACHER' || role === 'ADMIN';
}
