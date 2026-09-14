---
name: schedule-edit
description: Update Tal's weekly schedule (index.html) from a parent/teacher message — add or move a class, a one-off weekly change, a lesson swap, a reminder, or a vacation. Use for any request that changes what appears in the calendar.
---

# עדכון מערכת השעות

רוב הבקשות כאן הן הודעה מהמורה או מההורה בעברית. התהליך קצר בכוונה.

## 1. להחליט: קבוע או חד-פעמי?

| הבקשה נשמעת כמו | לאן זה הולך |
|---|---|
| "השבוע ספציפית", "מחר", "בשבוע הבא בלבד", "נדחה ל…" | `WEEK_OVERRIDES` |
| "נרשם לחוג", "מעכשיו והלאה", "כל שבוע" | `DAYS[day].activities` |
| "להביא X ביום Y" | `notes` ב-`WEEK_OVERRIDES` |
| "השיעור הוחלף" | `lessons` ב-`WEEK_OVERRIDES` |
| חג / אין לימודים | `VACATIONS` |

אם משהו זז מיום א ליום ב באותו שבוע – זה `remove` + `add` באותו override, לא אירוע חדש.
שים לב במיוחד ל"זה לא חדש, הם דחו את X" – זו הזזה.

## 2. לערוך

הפרטים המלאים של המבנה ב-`CLAUDE.md`. נקודות שנשכחות:

- `weekOf` = יום **ראשון** של השבוע, תאריך מלא. חשב אותו מהתאריך שבהודעה, אל תנחש.
- `remove.title` חייב להתאים ל-`title` המקורי **מילה במילה, כולל אימוג'י**.
- שינוי קבוע שמתחיל בעתיד מקבל `from: "MM-DD"`. חוג לשנה מקבל גם `until`.
- `type` חדש דורש שני כללי CSS (ראה CLAUDE.md).
- אם יש כבר override לאותו `weekOf` – להוסיף לתוכו, לא ליצור שני.

## 3. לסיים

```bash
node build-api.js
git add -A && git commit -m "<תיאור בעברית>" && git push
```

בלי טסטים ובלי הרצות דפדפן – זה שינוי נתונים. מבט על ה-diff מספיק.

## 4. לדווח למשתמש

בעברית, קצר: מה נכנס, לאיזה תאריך, ומה נשאר קבוע. **להצהיר במפורש על כל הנחה**
(תאריך התחלה, שעת סיום, מיקום) כדי שיוכל לתקן.
