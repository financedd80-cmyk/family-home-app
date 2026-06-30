type FamilyMember = {
  name: string;
  role: string;
};

type ItemType = "משימת בית" | "הסעה" | "תור" | "אירוע" | "חוזרת";
type Recurrence = "יומית" | "שבועית" | "חודשית" | "שנתית";

type Task = {
  person: string;
  text: string;
  itemType: ItemType;
  recurrence?: Recurrence;
  points?: number;
};

type PendingApproval = {
  person: string;
  text: string;
  points: number;
};

type Ride = {
  person: string;
  text: string;
  detail: string;
};

const CHILDREN = ["דניאל", "דור", "דוראל"];

const familyMembers: FamilyMember[] = [
  { name: "דיקלה", role: "מנהלת" },
  { name: "דודו", role: "הורה" },
  { name: "דניאל", role: "ילד" },
  { name: "דור", role: "ילד" },
  { name: "דוראל", role: "ילד" },
];

const timeframes = ["היום", "השבוע", "החודש", "השנה"];
const childFilters = ["כולם", "דניאל", "דור", "דוראל"];

const tasks: Task[] = [
  { person: "דוראל", text: "ניקוי שיניים", itemType: "חוזרת", recurrence: "יומית" },
  { person: "דיקלה", text: "החזרת בגדים לארון", itemType: "משימת בית" },
  { person: "דודו", text: "לוקח לבדיקת דם", itemType: "תור" },
  { person: "דיקלה", text: "סידור ארונות", itemType: "חוזרת", recurrence: "חודשית" },
  { person: "כל המשפחה", text: "ניקיון אביב", itemType: "חוזרת", recurrence: "שנתית" },
  { person: "דוראל", text: "מסיבת יום הולדת בגן", itemType: "אירוע" },
];

const pendingApprovals: PendingApproval[] = [
  { person: "דור", text: "פינוי מדיח", points: 1 },
  { person: "דניאל", text: "קיפול כביסה", points: 2 },
];

const rides: Ride[] = [
  { person: "דניאל", text: "חברים בנגבה", detail: "דיקלה לוקחת, דודו מחזיר" },
];

const weeklyScores = [
  { name: "דניאל", points: 5 },
  { name: "דור", points: 3 },
  { name: "דוראל", points: 2 },
];

const avatarColors = [
  "bg-accent-soft text-accent",
  "bg-accent2-soft text-accent2",
];

function avatarColor(name: string) {
  const code = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return avatarColors[code % avatarColors.length];
}

function showsPoints(task: Task) {
  return task.points !== undefined && CHILDREN.includes(task.person);
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          היום בבית
        </h1>
        <p className="text-muted">
          כל המשימות, ההסעות והאירועים של המשפחה במקום אחד
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted">טווח תצוגה</p>
        <div className="flex flex-wrap gap-2">
          {timeframes.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                index === 0
                  ? "bg-accent text-white"
                  : "border border-card-border bg-card text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted">בני המשפחה</p>
        <div className="flex flex-wrap gap-3">
          {familyMembers.map((member) => (
            <div
              key={member.name}
              className="flex items-center gap-2 rounded-full border border-card-border bg-card px-3 py-1.5 shadow-sm"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(
                  member.name
                )}`}
              >
                {member.name[0]}
              </span>
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-xs text-muted">{member.role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted">סינון לפי ילד</p>
        <div className="flex flex-wrap gap-2">
          {childFilters.map((label, index) => (
            <button
              key={label}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                index === 0
                  ? "bg-accent2 text-white"
                  : "border border-card-border bg-card text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-accent-soft bg-accent-soft/40 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-accent">
          ממתין לאישור הורה
        </h2>
        <ul className="flex flex-col gap-3">
          {pendingApprovals.map((item) => (
            <li
              key={`${item.person}-${item.text}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.text}</span>
                <span className="text-xs text-muted">{item.person}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted">
                  ממתין לאישור
                </span>
                <span className="rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
                  {item.points} נק׳
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">משימות פתוחות</h2>
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <li
                key={`${task.person}-${task.text}`}
                className="flex items-start justify-between gap-3 border-b border-card-border pb-3 last:border-none last:pb-0"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{task.text}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{task.person}</span>
                    {task.recurrence ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">
                        חוזרת {task.recurrence}
                      </span>
                    ) : (
                      <span className="rounded-full border border-card-border bg-background px-2 py-0.5">
                        {task.itemType}
                      </span>
                    )}
                  </div>
                </div>
                {showsPoints(task) && (
                  <span className="shrink-0 rounded-full bg-accent2-soft px-2.5 py-1 text-xs font-semibold text-accent2">
                    {task.points} נק׳
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">הסעות היום</h2>
          <ul className="flex flex-col gap-3">
            {rides.map((ride) => (
              <li
                key={`${ride.person}-${ride.text}`}
                className="flex flex-col gap-1"
              >
                <span className="text-sm font-medium">
                  {ride.person} — {ride.text}
                </span>
                <span className="text-xs text-muted">{ride.detail}</span>
                <span className="w-fit rounded-full border border-card-border bg-background px-2 py-0.5 text-xs text-muted">
                  הסעה
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-card-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">ניקוד שבועי</h2>
          <p className="text-xs text-muted">ניקוד נצבר על ידי הילדים בלבד</p>
          <ul className="flex flex-col gap-3">
            {weeklyScores.map((child) => (
              <li
                key={child.name}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(
                      child.name
                    )}`}
                  >
                    {child.name[0]}
                  </span>
                  <span className="text-sm font-medium">{child.name}</span>
                </div>
                <span className="text-sm font-semibold text-accent2">
                  {child.points} נק׳
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
