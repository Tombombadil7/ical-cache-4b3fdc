# **סנכרון אוטומטי של מטלות הטכניון \-Todoist \-ל**

## **🎯 הצורך**

הסקריפט האוטומטי הזה נולד מהצורך לעקוב ולראות את כל המטלות ושיעורי הבית  מהטכניון למקום אחד (moodle, webworks ואתר מדמ"ח) , חכם ונוח.  
הוא פותר שתי בעיות עיקריות:

1. **איחוד לוחות השנה:** במקום לעקוב אחרי כמה מקורות מידע, הכל מתרכז למקום אחד.  
2. **הפיכת אירועים למשימות:** אירוע בלוח שנה הוא פסיבי. משימה ב-Todoist היא אקטיבית \- אפשר לסמן שהיא הושלמה, להוסיף תזכורות, וכו'.

## **⚙️ מה הסקריפט עושה?**

הסקריפט רץ אוטומטית (למשל, פעם בשעה) ומבצע את הפעולות הבאות:

1. **איחוד חכם:** מושך את כל האירועים מלוח השנה הכללי של מודל (שאמור להכיל גם משימות מודל וגם משימות webworks) ומאתר מדמ"ח.
   
3. **תיקון מטלות מודל:** מוצא מטלות שיש להן שני אירועים (למשל, "נפתח ב-" ו"תאריך הגשה") ומאחד אותן למשימה אחת שההתחלה שלה היא זמן הפתיחה והסוף שלה הוא הדדליין.  
4. **העשרת מידע:** מוסיף אוטומטית שם קורס (לפי המפה שתגדירו בקוד) לשם המטלה.  
5. **ניקוי שמות:** מחליף אוטומטית ניסוחים מסורבלים כמו "יש להגיש" או "תאריך הגשה" בניסוח נקי "להגיש".  
6. **גיבוי ל-GitHub:** שומר קובץ calendar.ics מעודכן במאגר קבצים (Repo) ב-GitHub. זה הגיבוי שלכם, וגם מאפשר לכם להציג את לוח השנה הנקי ב-Google Calendar אם תרצו.  
7. **סנכרון ל-Todoist:**  
   * **יוצר משימות חדשות:** עבור כל מטלה חדשה שאין לה ייצוג ב-Todoist.  
   * **מעדכן משימות קיימות:** אם הדדליין של המטלה השתנה במודל, הסקריפט יעדכן את הדדליין במשימה ב-Todoist.  
   * **מוסיף תגיות:** מוסיף אוטומטית לכל משימה את התגית "שיעורי בית" וכן תגית עם שם הקורס (למשל "פיסיקה 1").

## **🚀 מדריך התקנה (למשתמש לא טכנולוגי)**

אל תיבהלו, זה תהליך חד פעמי שלוקח כ-15 דקות.

### **כלים נדרשים:**

1. **חשבון Pipedream:** פלטפורמה חינמית להרצת אוטומציות (כמו זו).  
2. **חשבון GitHub:** שירות חינמי לגיבוי קבצים (נצטרך אותו לגיבוי).  
3. **חשבון Todoist:** אפליקציית המטלות אליה נסנכרן.

### **שלב 1: יצירת "מפתח אישי" ב-GitHub**

כדי שהסקריפט יוכל לגשת ולעדכן את קובץ הגיבוי שלכם, הוא צריך "מפתח".

1. התחברו ל-GitHub.  
2. לחצו על תמונת הפרופיל שלכם למעלה ימינה \-\> **Settings**.  
3. גללו למטה בתפריט הצד ובחרו **Developer settings**.  
4. בחרו **Personal access tokens** \-\> **Tokens (classic)**.  
5. לחצו **Generate new token** \-\> **Generate new token (classic)**.  
6. תנו לטוקן שם (למשל "Pipedream Sync").  
7. ב-**Select scopes**, סמנו את התיבה **repo** (זה נותן הרשאה לקרוא ולכתוב למאגרים).  
8. לחצו **Generate token**.  
9. **חשוב מאוד:** העתיקו את הטוקן (הקוד שמתחיל ב-ghp\_...) ושמרו אותו בצד. לא תוכלו לראות אותו שוב.

### **שלב 2: יצירת מאגר (Repo) ב-GitHub**

זה המקום בו קובץ הגיבוי calendar.ics יישמר.

1. ב-GitHub, לחצו על ה-+ למעלה ימינה \-\> **New repository**.  
2. תנו לו שם. למשל: ical-cache-4b3fdc (או כל שם אחר שתרצו, רק תזכרו אותו).  
3. סמנו **Public** (זה בסדר, הקבצים לא מכילים מידע אישי).  
4. לחצו **Create repository**.

### **שלב 3: הגדרת התהליך ב-Pipedream**

כאן קורה הקסם.

1. היכנסו ל-Pipedream וצרו **New Workflow**.  
2. **Trigger (טריגר):** בחרו **Schedule**.  
3. **Schedule:** הגדירו כל **1 Hour** (או באיזו תדירות שתרצו).  
4. **Steps (שלבים):** לחצו על ה-+ ובחרו **Node** \-\> **Run Node.js code**.  
5. **מחיקת הקוד הקיים:** מחקו את כל מה שמופיע בחלון הקוד.  
6. **הדבקת הקוד:** הדביקו את **כל** קוד הסקריפט (V9) שקיבלתם.

### **שלב 4: חיבור והגדרות**

בחלק העליון של חלון הקוד, תראו את ההגדרות (Props):

1. db:  
   * לחצו **Connect App**.  
   * בחרו **Pipedream Data Stores** \-\> **Use a data store created in your Pipedream account**.  
   * תנו לו שם, למשל calendar\_sync\_db.  
   * שמרו. זה ישמש את הסקריפט לזכור אילו משימות הוא כבר יצר.  
2. todoist:  
   * לחצו **Connect App**.  
   * בחרו **Todoist** וחברו את חשבון ה-Todoist שלכם.  
3. github\_token:  
   * לחצו **Connect App**.  
   * בחרו **GitHub** \-\> **Use a secret**.  
   * תנו לו שם (למשל GITHUB\_TOKEN) והדביקו את המפתח האישי שיצרתם בשלב 1\.  
4. moodle\_url **(חדש\!):**  
   * זהו שדה טקסט. הדביקו כאן את קישור ה-iCal האישי שלכם **ממודל**.  
   * (איך למצוא? במודל, לכו ללוח השנה \-\> "ייצוא לוח שנה" \-\> "קבל URL של לוח שנה" \-\> העתיקו את הקישור שמופיע).  
5. grades\_url **(חדש\!):**  
   * זהו שדה טקסט. הדביקו כאן את קישור ה-iCal האישי שלכם **מאתר הציונים של מדמ"ח**.  
   * (איך למצוא? באתר הציונים, לחצו על "לוח שנה" (Calendar) והעתיקו את הקישור).  
6. gh\_owner:  
   * רשמו את שם המשתמש שלכם ב-GitHub (למשל Tombombadil7).  
7. gh\_repo:  
   * רשמו את שם המאגר שיצרתם בשלב 2 (למשל ical-cache-4fdc).


### **שלב 5: התאמה אישית של הקוד**
א.
ב.גללו קצת למטה בקוד עצמו (לא בהגדרות למעלה) עד שתמצאו את:  
// \--- CONFIGURATION \---  
const COURSE\_MAP \= {  
  "01140051": "Physics 1",  
  "234124": "Intro to Systems",  
  // הוסף את הקורסים שלך כאן  
};  
// \---------------------

זה החלק הכי חשוב:  
כאן אתם צריכים למפות בין מספר הקורס (כפי שהוא מופיע בלוח השנה) לבין השם שאתם רוצים שיופיע ב-Todoist. הוסיפו שורות לפי הפורמט: "מספר קורס": "שם הקורס",.  
*אם כתובות ה-URL של לוחות השנה שלכם שונות, תצטרכו לעדכן גם אותן (היכן שרשום const sources).*

### **שלב 6: הפעלה\!**

1. לחצו **Deploy** למעלה ימינה.  
2. לאחר שהתהליך נשמר, לחצו **Test** כדי להריץ אותו ידנית בפעם הראשונה.  
3. היכנסו ל-Todoist שלכם. אתם אמורים לראות את כל המשימות החדשות מופיעות\!

סיימתם\! מעכשיו, התהליך ירוץ אוטומטית ויעדכן לכם את המשימות.
