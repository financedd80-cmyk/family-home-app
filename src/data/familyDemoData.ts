import type {
  AddKind,
  FamilyMember,
  Recurrence,
  Task,
  TaskFormValues,
  TaskStatus,
  TaskType,
} from "@/types/familyApp";

export const CHILDREN = ["דניאל", "דור", "דוראל"];

export const familyMembers: FamilyMember[] = [
  { name: "דיקלה", role: "admin" },
  { name: "דודו", role: "parent" },
  { name: "דניאל", role: "child" },
  { name: "דור", role: "child" },
  { name: "דוראל", role: "child" },
];

export const currentUser = familyMembers.find((m) => m.name === "דיקלה")!;
export const isAdmin = currentUser.role === "admin";

export const TASK_TYPES: TaskType[] = [
  "משימת בית",
  "הסעה",
  "תור",
  "אירוע",
  "כללי",
];
export const TASK_STATUSES: TaskStatus[] = [
  "פתוחה",
  "בוצעה",
  "ממתינה לאישור",
  "אושרה",
  "נדחתה",
  "בוטלה",
];
export const RECURRENCES: Recurrence[] = [
  "לא חוזרת",
  "יומית",
  "שבועית",
  "חודשית",
  "שנתית",
];

export const TABS = [
  "היום",
  "יומן",
  "משימות",
  "ניקוד",
  "משפחה",
  "הוספה",
] as const;
export const TIMEFRAMES = ["היום", "השבוע", "החודש", "השנה"] as const;
export const MEMBER_FILTERS = [
  "כולם",
  "דניאל",
  "דור",
  "דוראל",
  "דיקלה",
  "דודו",
] as const;
export const STATUS_FILTERS = [
  "כולם",
  "פתוחה",
  "ממתינה לאישור",
  "אושרה",
  "בוטלה",
] as const;
export const TYPE_FILTERS = [
  "כולם",
  "משימת בית",
  "הסעה",
  "תור",
  "אירוע",
  "כללי",
] as const;
export const ADD_KINDS: readonly AddKind[] = [
  "משימה",
  "אירוע",
  "הסעה",
  "תור",
  "משימה חוזרת",
];

export const ADD_KIND_PRESETS: Record<AddKind, Partial<TaskFormValues>> = {
  משימה: { type: "משימת בית", isRecurring: false, recurrence: "לא חוזרת" },
  אירוע: { type: "אירוע", isRecurring: false, recurrence: "לא חוזרת" },
  הסעה: { type: "הסעה", isRecurring: false, recurrence: "לא חוזרת" },
  תור: { type: "תור", isRecurring: false, recurrence: "לא חוזרת" },
  "משימה חוזרת": {
    type: "משימת בית",
    isRecurring: true,
    recurrence: "שבועית",
  },
};

export const HEBREW_DAY_NAMES = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildInitialTasks(today: Date): Task[] {
  const d = (offset: number) => toISODate(addDays(today, offset));
  const tasks: Omit<Task, "requiresApproval">[] = [
    {
      id: "t1",
      title: "ניקוי שיניים",
      type: "כללי",
      assignedTo: "דוראל",
      date: d(0),
      time: "07:30",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "יומית",
      notes: "",
    },
    {
      id: "t2",
      title: "פינוי מדיח",
      type: "משימת בית",
      assignedTo: "דור",
      date: d(0),
      time: "08:00",
      status: "ממתינה לאישור",
      points: 1,
      isRecurring: true,
      recurrence: "יומית",
      notes: "",
    },
    {
      id: "t3",
      title: "קיפול כביסה",
      type: "משימת בית",
      assignedTo: "דניאל",
      date: d(0),
      time: "16:00",
      status: "ממתינה לאישור",
      points: 2,
      isRecurring: true,
      recurrence: "שבועית",
      notes: "",
    },
    {
      id: "t4",
      title: "החזרת בגדים לארון",
      type: "משימת בית",
      assignedTo: "דיקלה",
      date: d(0),
      time: "20:00",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t5",
      title: "חברים בנגבה",
      type: "הסעה",
      assignedTo: "דניאל",
      date: d(0),
      time: "17:00",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
      rideRider: "דניאל",
      rideDriverThere: "דיקלה",
      rideDriverBack: "דודו",
      pickupLocation: "בית הספר",
      returnLocation: "הבית",
    },
    {
      id: "t6",
      title: "לוקח לבדיקת דם",
      type: "תור",
      assignedTo: "דודו",
      date: d(1),
      time: "09:30",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "מרפאת קופת חולים",
    },
    {
      id: "t7",
      title: "מסיבת יום הולדת בגן",
      type: "אירוע",
      assignedTo: "דוראל",
      date: d(3),
      time: "16:30",
      status: "פתוחה",
      points: 0,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t8",
      title: "סידור ארונות",
      type: "משימת בית",
      assignedTo: "דיקלה",
      date: d(6),
      time: "10:00",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "חודשית",
      notes: "",
    },
    {
      id: "t9",
      title: "ניקיון אביב",
      type: "כללי",
      assignedTo: "דיקלה",
      date: d(120),
      time: "10:00",
      status: "פתוחה",
      points: 0,
      isRecurring: true,
      recurrence: "שנתית",
      notes: "",
    },
    {
      id: "t10",
      title: "סידור חדר",
      type: "משימת בית",
      assignedTo: "דור",
      date: d(-2),
      time: "18:00",
      status: "אושרה",
      points: 2,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t11",
      title: "שיעורי בית",
      type: "כללי",
      assignedTo: "דניאל",
      date: d(-1),
      time: "17:00",
      status: "אושרה",
      points: 3,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t12",
      title: "סידור הגינה",
      type: "משימת בית",
      assignedTo: "דודו",
      date: d(-1),
      time: "",
      status: "אושרה",
      points: 3,
      isRecurring: false,
      recurrence: "לא חוזרת",
      notes: "",
    },
    {
      id: "t13",
      title: "תיאום לו״ז שבועי",
      type: "כללי",
      assignedTo: "דיקלה",
      date: d(-2),
      time: "21:00",
      status: "אושרה",
      points: 2,
      isRecurring: true,
      recurrence: "שבועית",
      notes: "",
    },
  ];
  return tasks.map((task) => ({
    ...task,
    requiresApproval: CHILDREN.includes(task.assignedTo),
  }));
}

export function emptyFormValues(dateStr: string): TaskFormValues {
  return {
    title: "",
    type: "משימת בית",
    assignedTo: CHILDREN[0],
    date: dateStr,
    time: "08:00",
    endTime: "",
    points: "1",
    isRecurring: false,
    recurrence: "לא חוזרת",
    notes: "",
    status: "פתוחה",
    rideRider: "",
    rideDriverThere: "",
    rideDriverBack: "",
    pickupLocation: "",
    returnLocation: "",
  };
}
