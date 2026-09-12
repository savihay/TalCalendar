# API של מערכת השעות

`https://savihay.github.io/TalCalendar/api/schedule.json`

JSON סטטי שנבנה אוטומטית מ-`index.html` (הסקריפט `build-api.js` מריץ את הלוגיקה
האמיתית של הדף, כולל חופשות ושינויים חד-פעמיים). GitHub Action מעדכן אותו בכל
push שנוגע ב-`index.html`. ה-CDN של GitHub Pages מחזיר `Access-Control-Allow-Origin: *`,
כך שאפשר לקרוא לו גם מהדפדפן וגם משרת.

## מבנה

```jsonc
{
  "child": "טל", "grade": "ד׳", "timezone": "Asia/Jerusalem",
  "schoolYear": "2026/2027", "coversFrom": "2026-09-06", "coversTo": "2027-07-30",
  "vacations": [ { "name": "סוכות", "from": "2026-09-25", "to": "2026-10-03", "back": "2026-10-04" } ],
  "days": [
    {
      "date": "2026-09-15", "dayName": "יום שלישי",
      "school": true, "vacation": null,
      "endsAt": "12:45",                    // שעת סיום הלימודים
      "uniform": "תלבושת ספורט",             // null אם אין
      "lessons": ["מורשת", "מתמטיקה", …],    // לפי סדר השיעורים
      "activities": [                        // חוגים ומפגשים אחרי הלימודים
        { "time": "13:45", "title": "חוג רובלוקס", "emoji": "🎮",
          "details": "כיתה ד1", "startsOn": null, "category": "roblox" }
      ],
      "note": null                           // תזכורת חד-פעמית ליום הזה
    }
  ]
}
```

`days` מכיל את כל ימי הלימודים (ראשון–שישי) עד סוף שנת הלימודים, ממוין לפי תאריך.
ימי חופש מופיעים עם `school: false` ו-`vacation` מלא.

## שימוש עם Gemini Live

מסננים בצד הלקוח לטווח שביקשו – לא שולחים למודל את כל השנה.

```python
import datetime, requests
from google.genai import types

URL = "https://savihay.github.io/TalCalendar/api/schedule.json"

get_schedule = {
    "name": "get_schedule",
    "description": "מערכת השעות של טל: שיעורים, שעת סיום, תלבושת, חוגים וחופשות. "
                   "להשתמש בכל שאלה על מה יש לטל היום/מחר/ביום מסוים.",
    "parameters": {
        "type": "object",
        "properties": {
            "start_date": {"type": "string", "description": "YYYY-MM-DD. ברירת מחדל: היום"},
            "days": {"type": "integer", "description": "כמה ימים קדימה (1=יום אחד, 7=שבוע). ברירת מחדל 1"}
        }
    }
}

tools = [{"function_declarations": [get_schedule]}]
config = {"response_modalities": ["AUDIO"], "tools": tools}


def run_get_schedule(start_date=None, days=1):
    data = requests.get(URL, timeout=10).json()
    start = datetime.date.fromisoformat(start_date) if start_date else datetime.date.today()
    end = start + datetime.timedelta(days=max(1, days) - 1)
    return {
        "today": datetime.date.today().isoformat(),
        "days": [d for d in data["days"] if start.isoformat() <= d["date"] <= end.isoformat()],
    }

# בלולאת ה-Live:
#   if response.tool_call:
#       replies = [types.FunctionResponse(id=fc.id, name=fc.name,
#                                         response=run_get_schedule(**(fc.args or {})))
#                  for fc in response.tool_call.function_calls]
#       await session.send_tool_response(function_responses=replies)
```

שווה להוסיף ל-system instruction של הרובוט את התאריך של היום, אחרת הוא לא יודע
לתרגם "מחר" לתאריך.
