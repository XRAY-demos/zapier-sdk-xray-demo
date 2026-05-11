import { createZapierSdk } from "@zapier/zapier-sdk";

type ZapierClient  = ReturnType<typeof createZapierSdk>;
type Connection    = Awaited<ReturnType<ZapierClient["listConnections"]>>["data"][number];

const DEMO_ACCOUNT = process.env.ZAPIER_CONNECTION_EMAIL ?? "";

// Synchronous — works on an already-fetched connections list.
// Pass an empty string for titleSearch to match by app key alone.
function findConnection(connections: Connection[], appKey: string, titleSearch = DEMO_ACCOUNT) {
  const conn = connections.find(
    (c) => (!titleSearch || c.title?.includes(titleSearch)) && c.app_key?.includes(appKey)
  );
  if (!conn) {
    throw new Error(
      `No active ${appKey} connection found${titleSearch ? ` matching "${titleSearch}"` : ""}.\n` +
        `Add it at: https://zapier.com/app/assets/connections`
    );
  }
  return conn;
}

export interface BriefData {
  events: Record<string, unknown>[];
  emails: Record<string, unknown>[];
  tasks:  Record<string, unknown>[];
}

export function createClient() {
  return createZapierSdk();
}

export async function resolveConnections(zapier: ZapierClient): Promise<Connection[]> {
  console.log(`  Resolving connections for ${DEMO_ACCOUNT}...`);
  const { data } = await zapier.listConnections({ owner: "me", isExpired: false });
  console.log("  Connections resolved.");
  return data;
}

export async function gatherBriefData(
  zapier: ZapierClient,
  connections: Connection[]
): Promise<BriefData> {
  const calConn      = findConnection(connections, "GoogleCalendarCLIAPI");
  const gmailConn    = findConnection(connections, "GoogleMailV2CLIAPI");
  const airtableConn = findConnection(connections, "AirtableCLIAPI");

  const calendar = zapier.apps.google_calendar({ connectionId: calConn.id });
  const gmail    = zapier.apps.gmail({ connectionId: gmailConn.id });
  const airtable = zapier.apps.airtable({ connectionId: airtableConn.id });

  const today = new Date().toISOString().split("T")[0];

  console.log("  Fetching data...");
  const [eventsResult, emailsResult, tasksResult] = await Promise.all([
    calendar.search.event_v2({
      inputs: { calendarid: "primary", search_term: today },
    }),
    gmail.search.message({
      inputs: { query: "is:unread newer_than:1d" },
    }),
    airtable.search.get_all_records({
      inputs: {
        applicationId: process.env.AIRTABLE_BASE_ID ?? "",
        tableId:       process.env.AIRTABLE_TABLE_ID ?? "",
      },
    }),
  ]);

  type RawEmail = { from?: { name?: string; email?: string }; subject?: string; date?: string; body_plain?: string; };
  type RawEvent = { summary?: string; start?: unknown; end?: unknown; location?: string };
  type RawTask  = { fields?: Record<string, unknown> };

  const emails = ((emailsResult.data ?? []) as RawEmail[]).slice(0, 10).map((e) => ({
    from:    e.from,
    subject: e.subject,
    date:    e.date,
    body:    e.body_plain,
  }));

  const events = ((eventsResult.data ?? []) as RawEvent[]).slice(0, 10).map((e) => ({
    summary:  e.summary,
    start:    e.start,
    end:      e.end,
    location: e.location,
  }));

  const tasks = ((tasksResult.data ?? []) as RawTask[]).slice(0, 10).map((t) => t.fields ?? t);

  return { events, emails, tasks };
}

export async function generateBrief(
  zapier: ZapierClient,
  connections: Connection[],
  prompt: string
): Promise<string> {
  console.log("  Provider: ChatGPT (gpt-4o-mini)");
  // Custom helper — searches the pre-fetched connections list by Zapier app key
  const conn = findConnection(connections, "ChatGPTCLIAPI", "");
  // SDK — creates an app client scoped to this connection
  const ai = zapier.apps.chatgpt({ connectionId: conn.id });
  // SDK — executes the action
  const result = await ai.write.conversation_responses_api({
    inputs: { user_message: prompt, model: "gpt-4o-mini" },
  });
  // Zapier wraps the response — drill in to get the text
  return ((result.data as unknown[])[0] as { output_text: string }).output_text;
}

export async function sendSlackDM(
  zapier: ZapierClient,
  connections: Connection[],
  text: string,
  userId: string
): Promise<void> {
  // Slack connection title uses the workspace handle, not the Gmail address
  const slackConn = findConnection(connections, "SlackCLIAPI", process.env.SLACK_WORKSPACE ?? "");
  const slack = zapier.apps.slack({ connectionId: slackConn.id });

  await slack.write.direct_message({
    inputs: { channel: userId, text, as_bot: "yes" },
  });
}
