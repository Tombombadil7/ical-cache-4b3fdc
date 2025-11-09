import { axios } from "@pipedream/platform";

export default defineComponent({
  name: "Sync Moodle to Todoist (V10 - Dynamic URLs)",
  props: {
    db: { type: "data_store" },
    todoist: { type: "app", app: "todoist" },
    github_token: { type: "string", secret: true },
    // --- חדש: קישורים דינאמיים ---
    moodle_url: { 
      type: "string", 
      label: "Moodle iCal URL", 
      secret: true, 
      description: "קישור iCal מלא ממודל (כולל authtoken)" 
    },
    grades_url: { 
      type: "string", 
      label: "Grades (CS) iCal URL", 
      secret: true, 
      description: "קישור iCal מלא מאתר הציונים של מדמ\"ח" 
    },
    // ----------------------------
    gh_owner: { type: "string", default: "Tombombadil7" },
    gh_repo: { type: "string", default: "ical-cache-4b3fdc" },
    gh_path: { type: "string", default: "calendar.ics" },
  },
  async run({ $ }) {
    console.log("🚀 STARTING WORKFLOW V10 (Dynamic URLs)");

    // --- CONFIGURATION ---
    const COURSE_MAP = {
      "01140051": "Physics 1",
      "234124": "Intro to Systems",
      // Add full list here
    };
    // ---------------------

    const ghHeaders = { Authorization: `token ${this.github_token}`, Accept: "application/vnd.github.v3+json" };
    const todoistHeaders = { Authorization: `Bearer ${this.todoist.$auth.oauth_access_token}`, "Content-Type": "application/json" };

    // --- HELPERS ---
    const extractEvents = (text) => text?.match(/BEGIN:VEVENT[\sS]+?END:VEVENT/gi) || [];
    const getField = (block, name) => block.match(new RegExp(`^${name}[:;](.*)$`, "mi"))?.[1].trim();
    const getCourseID = (block) => getField(block, "CATEGORIES")?.match(/(\d{6,9})(?:\.|$)/)?.[1];
    const toISO = (icalDate) => {
        if (!icalDate) return null;
        const c = icalDate.replace('Z', '');
        return (c.length >= 15) ? `${c.substring(0,4)}-${c.substring(4,6)}-${c.substring(6,8)}T${c.substring(9,11)}:${c.substring(11,13)}:${c.substring(13,15)}` : null;
    };

    // 1. FETCH SOURCES
    console.log("\n--- STAGE 1: FETCH ---");
    let allEvents = [];
    let sha = null;
    try {
      const res = await axios($, { url: `https://api.github.com/repos/${this.gh_owner}/${this.gh_repo}/contents/${this.gh_path}`, headers: ghHeaders });
      sha = res.sha;
      allEvents.push(...extractEvents(Buffer.from(res.content, "base64").toString("utf8")));
    } catch (e) {}

    // --- שימוש בקישורים מה-Props ---
    const sources = [
      { name: "Moodle", url: this.moodle_url },
      { name: "Grades", url: this.grades_url }
    ];
    // ---------------------------------

    for (const source of sources) {
      // ודא שהמשתמש הזין קישור לפני הניסיון למשוך אותו
      if (!source.url) {
        console.log(`⏭️ Skipping ${source.name}: No URL provided.`);
        continue;
      }
      try {
         const res = await axios($, { url: source.url, responseType: 'text', headers: {"User-Agent": "Mozilla/5.0"} });
         allEvents.push(...extractEvents((typeof res === 'string') ? res : res.data));
      } catch (e) { console.error(`❌ Fetch failed: ${source.name} (${e.message})`); }
    }

    // 2. PROCESS & MERGE
    console.log("\n--- STAGE 2: PROCESS ---");
    const openMap = new Map();
    const moodleRegex = /(נפתח ב|תאריך הגשה)[:\s]+(.*)/i;
    // Index opening times
    allEvents.forEach(e => {
         const cid = getCourseID(e);
         const match = (getField(e, "SUMMARY") || "").replace(/^.*? - /, "").match(moodleRegex);
         if (cid && match && match[1].includes("נפתח ב")) {
             openMap.set(`${cid}|${match[2].trim()}`, getField(e, "DTSTART"));
         }
    });

    const uniqueMap = new Map();
    for (let e of allEvents) {
      if ((getField(e, "SUMMARY")||"").includes("נפתח ב")) continue;

      const cid = getCourseID(e);
      let summary = getField(e, "SUMMARY") || "";
      const match = summary.replace(/^.*? - /, "").match(moodleRegex);

      // Merge start times
      if (cid && match && match[1].includes("תאריך הגשה")) {
        const openTime = openMap.get(`${cid}|${match[2].trim()}`);
        if (openTime) e = e.replace(/^DTSTART[:;].*$/m, `DTSTART:${openTime}`);
      }

      // Rename & Clean
      if (cid && COURSE_MAP[cid] && !summary.startsWith(COURSE_MAP[cid])) summary = `${COURSE_MAP[cid]} - ${summary}`;
      if (/(:| - )(יש להגיש|תאריך הגשה)/.test(summary)) summary = summary.replace(/(יש להגיש|תאריך הגשה)/g, "להגיש");
      e = e.replace(/^(SUMMARY:)(.*)$/m, `$1${summary}`);

      const uid = getField(e, "UID");
      if (uid) uniqueMap.set(uid, e);
    }

    // 3. GITHUB SYNC
    console.log("\n--- STAGE 3: GITHUB ---");
    const finalICS = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TechnionMerged//EN", "METHOD:PUBLISH", ...uniqueMap.values(), "END:VCALENDAR"].join("\r\n");
    await axios($, {
      method: "PUT", url: `https://api.github.com/repos/${this.gh_owner}/${this.gh_repo}/contents/${this.gh_path}`, headers: ghHeaders,
      data: { message: `Sync: ${uniqueMap.size} events`, content: Buffer.from(finalICS).toString("base64"), ...(sha && { sha }) }
    });

    // 4. TODOIST SYNC
    console.log("\n--- STAGE 4: TODOIST UPSERT ---");
    let stats = { created: 0, updated: 0, skipped: 0 };

    for (const [uid, event] of uniqueMap.entries()) {
        const end = getField(event, "DTEND");
        if (!end) continue;
        const start = getField(event, "DTSTART");
        const summary = getField(event, "SUMMARY");
        const cid = getCourseID(event);
        const currentSig = `${summary}|${end}|${start || 'N/A'}`;
        const cached = await this.db.get(uid);

        const payload = {
            content: summary,
            due_datetime: toISO(end),
            description: `📅 Opens: ${toISO(start) || 'N/A'}\n🔑 UID: ${uid}`,
            priority: 4,
            labels: (cid && COURSE_MAP[cid]) ? ["שיעורי בית", COURSE_MAP[cid]] : ["שיעורי בית"]
        };

        try {
            // Update existing
            if (cached && typeof cached === 'object' && cached.id) {
                if (cached.sig !== currentSig) {
                    console.log(`🔄 Updating: "${summary}"`);
                    await axios($, { method: "post", url: `https://api.todoist.com/rest/v2/tasks/${cached.id}`, headers: todoistHeaders, data: payload });
                    await this.db.set(uid, { id: cached.id, sig: currentSig });
                    stats.updated++;
                } else { stats.skipped++; }
                continue;
            }
            // Skip legacy cache
            if (cached === true) { stats.skipped++; continue; }

            // Create new
            console.log(`📤 Creating: "${summary}"`);
            const res = await axios($, { method: "post", url: "https://api.todoist.com/rest/v2/tasks", headers: todoistHeaders, data: payload });
            
            // Save new state
            await this.db.set(uid, { id: res.id, sig: currentSig });
            stats.created++;

        } catch (e) { console.error(`❌ Error on ${uid}: ${e.message}`); }
    }

    return $.export("$summary", `Sync Complete: +${stats.created} created, 🔄 ${stats.updated} updated, ⏭️ ${stats.skipped} skipped.`);
  },
});
