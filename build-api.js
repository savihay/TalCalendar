#!/usr/bin/env node
/* יוצר את api/schedule.json מתוך index.html.
   הקובץ הזה לא מכפיל את הלוגיקה: הוא מריץ את הסקריפט האמיתי של הדף
   בתוך DOM מזויף, ואז שואל אותו מה יש בכל שבוע – כך שכל שינוי במערכת
   מתעדכן ב-API אוטומטית.  הרצה: node build-api.js  */

const fs = require('fs');
const vm = require('path') && require('vm');
const path = require('path');

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

/* DOM מינימלי – מספיק כדי שהסקריפט של הדף ירוץ בלי דפדפן */
const stubEl = () => new Proxy({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} } },
  { get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && k.startsWith('add') ? () => {} : '')),
    set: (t, k, v) => (t[k] = v, true) });
const sandbox = {
  document: { getElementById: stubEl, querySelectorAll: () => [], querySelector: stubEl,
              documentElement: { style: { setProperty() {} } }, addEventListener() {} },
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
  navigator: {}, console
};
sandbox.window.document = sandbox.document;

const EMOJI = /[\p{Extended_Pictographic}‍️⃣]/gu;
const clean = s => s.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
const icons = s => (s.match(EMOJI) || []).join('').replace(/[‍️]/g, '');

sandbox.__emit = function (helpers) { sandbox.__helpers = helpers; };

vm.runInNewContext(script + `
  __emit({ DAYS, VACATIONS, UNIFORMS, TODAY,
           setWeek: o => { WEEK_OFFSET = o; WEEK_START = computeWeekStart(); },
           dateOfDay, dayVacation, dayNote, weekActs, resolveDate });
`, sandbox, { filename: 'index.html' });

const H = sandbox.__helpers;
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* כל שנת הלימודים: מהשבוע הראשון של ספטמבר ועד 31 ביולי.
   הטווח קבוע ולא תלוי ביום שבו הקובץ נבנה – אחרת כל בנייה הייתה
   מייצרת פלט שונה וה-Action היה מתנגש בקומיטים מקומיים. */
const startY = H.TODAY.getMonth() >= 7 ? H.TODAY.getFullYear() : H.TODAY.getFullYear() - 1;
const LAST = new Date(startY + 1, 6, 31);
const sep1 = new Date(startY, 8, 1);
const FIRST = new Date(startY, 8, 1 + ((7 - sep1.getDay()) % 7));   // יום ראשון הראשון בספטמבר

H.setWeek(0);
const FIRST_OFF = Math.round((FIRST - H.dateOfDay(0)) / (7 * 864e5));

const days = [];
for (let off = FIRST_OFF; off < FIRST_OFF + 60; off++) {
  H.setWeek(off);
  if (H.dateOfDay(0) > LAST) break;
  for (let i = 0; i < 6; i++) {
    const date = H.dateOfDay(i);
    if (date > LAST) continue;
    const vac = H.dayVacation(i);
    const src = H.DAYS[i];
    const note = vac ? null : H.dayNote(i);
    const uni = (!vac && src.uniform) ? H.UNIFORMS[src.uniform] : null;
    days.push({
      date: iso(date),
      dayName: src.name,
      vacation: vac ? { name: vac.name, from: vac.start, to: vac.end, back: vac.back || null } : null,
      school: !vac,
      endsAt: vac ? null : src.end,
      uniform: uni ? uni.label : null,
      lessons: vac ? [] : src.lessons.map(clean),
      activities: H.weekActs(i).map(a => ({
        time: a.time,
        title: clean(a.title),
        emoji: icons(a.title) || null,
        details: a.sub || null,
        startsOn: a.startsOn ? iso(H.resolveDate(a.startsOn)) : null,
        category: a.type
      })),
      note: note ? clean(note.text) : null
    });
  }
}

const out = {
  child: 'טל',
  grade: 'ד׳',
  timezone: 'Asia/Jerusalem',
  schoolYear: startY + '/' + (startY + 1),
  coversFrom: days[0].date,
  coversTo: days[days.length - 1].date,
  source: 'https://savihay.github.io/TalCalendar/',
  notes: 'ימי הלימודים הם ראשון–שישי. השעות הן שעת סיום הלימודים; activities הן חוגים ומפגשים אחרי הלימודים.',
  vacations: H.VACATIONS.map(v => ({
    name: v.name, from: v.start, to: v.end, back: v.back || null,
    isVacation: !v.noVacation, note: v.note || null
  })),
  days
};

fs.mkdirSync(path.join(ROOT, 'api'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'api', 'schedule.json'), JSON.stringify(out, null, 1) + '\n');
console.log('api/schedule.json:', days.length, 'ימים,', (fs.statSync(path.join(ROOT, 'api', 'schedule.json')).size / 1024).toFixed(0) + 'KB');
