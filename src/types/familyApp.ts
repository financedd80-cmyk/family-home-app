export type Role = "admin" | "parent" | "child";
export type TaskType = "משימת בית" | "הסעה" | "תור" | "אירוע" | "כללי";
export type TaskStatus =
  | "פתוחה"
  | "בוצעה"
  | "ממתינה לאישור"
  | "אושרה"
  | "נדחתה"
  | "בוטלה";
export type Recurrence =
  | "לא חוזרת"
  | "יומית"
  | "שבועית"
  | "חודשית"
  | "שנתית";
export type ActiveTab =
  | "היום"
  | "יומן"
  | "משימות"
  | "ניקוד"
  | "משפחה"
  | "הוספה";
export type AddKind = "משימה" | "אירוע" | "הסעה" | "תור" | "משימה חוזרת";

export type Permissions = {
  canEarnPoints: boolean;
  canEditPoints: boolean;
  canResetPoints: boolean;
  canApproveTasks: boolean;
};

export type FamilyMember = {
  name: string;
  role: Role;
};

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  assignedTo: string;
  date: string;
  time: string;
  endTime?: string;
  status: TaskStatus;
  points: number;
  isRecurring: boolean;
  recurrence: Recurrence;
  notes: string;
  // Whether marking this task done routes it to "ממתינה לאישור" (true) or
  // straight to "אושרה" (false). Persisted as tasks.requires_approval in
  // Supabase; for demo/local tasks it's computed the same way it always was
  // (assignee is one of CHILDREN).
  requiresApproval: boolean;
  rideRider?: string;
  rideDriverThere?: string;
  rideDriverBack?: string;
  pickupLocation?: string;
  returnLocation?: string;
};

export type TaskFormValues = {
  title: string;
  type: TaskType;
  assignedTo: string;
  date: string;
  time: string;
  endTime: string;
  points: string;
  isRecurring: boolean;
  recurrence: Recurrence;
  notes: string;
  status: TaskStatus;
  rideRider: string;
  rideDriverThere: string;
  rideDriverBack: string;
  pickupLocation: string;
  returnLocation: string;
};
