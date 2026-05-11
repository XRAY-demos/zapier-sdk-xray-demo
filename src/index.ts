import "dotenv/config"; // must be first — loads .env before any module reads process.env
import { createClient, resolveConnections, gatherBriefData, generateBrief, sendSlackDM } from "./zapier.js";

const DIVIDER = "─".repeat(60);
const SLACK_USER_ID = process.env.SLACK_USER_ID ?? "";

function buildPrompt(data: Awaited<ReturnType<typeof gatherBriefData>>): string {
  return `
You are a chief of staff. Produce a concise morning brief (under 200 words) from the data below.
Highlight:
  1. Must-attend meetings today (include times)
  2. Urgent emails requiring a reply (include sender and subject)
  3. Top open tasks from Airtable

Format rules — this brief will be sent as a Slack message:
- Use *single asterisks* for bold (NOT double)
- Use _underscores_ for italics
- Use bullet points with • or -
- Do NOT use markdown headers like # or ##; use *bold text* as section labels instead
- Keep it tight — Slack messages should be easy to scan on mobile

Be specific — use names, subjects, and times. Skip anything that looks routine or low-priority.

CALENDAR EVENTS (today):
${JSON.stringify(data.events, null, 2)}

UNREAD EMAILS (last 24h):
${JSON.stringify(data.emails, null, 2)}

OPEN TASKS (Airtable):
${JSON.stringify(data.tasks, null, 2)}
`.trim();
}

async function main() {
  if (!SLACK_USER_ID) throw new Error("SLACK_USER_ID is not set in .env");

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  console.log(`\n${DIVIDER}`);
  console.log(`  Morning Brief — ${date}`);
  console.log(DIVIDER);

  console.log("\nConnecting via Zapier SDK...");
  const zapier      = createClient();
  const connections = await resolveConnections(zapier);

  console.log("\nGathering data...");
  const data = await gatherBriefData(zapier, connections);
  console.log(`  Got ${data.events.length} events, ${data.emails.length} emails, ${data.tasks.length} tasks.\n`);

  console.log("Generating brief...\n");
  const brief = await generateBrief(zapier, connections, buildPrompt(data));

  console.log(DIVIDER);
  console.log(brief);
  console.log(DIVIDER + "\n");

  console.log(`Sending to Slack (${SLACK_USER_ID})...`);
  await sendSlackDM(zapier, connections, brief, SLACK_USER_ID);
  console.log("  Done. Brief delivered.\n");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
