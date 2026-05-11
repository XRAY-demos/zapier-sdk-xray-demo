// ── Anthropic provider block ──────────────────────────────────────────────
// Replace the contents of generateBrief() in src/zapier.ts with this code.
// Also add an Anthropic connection at: https://zapier.com/app/assets/connections

console.log("  Provider: Anthropic (claude-haiku-4-5)");
// Custom helper — searches the pre-fetched connections list by Zapier app key
const conn = findConnection(connections, "AnthropicCLIAPI", "");
// SDK — creates an app client scoped to this connection
const ai = zapier.apps.anthropic_claude({ connectionId: conn.id });
// SDK — executes the action
const result = await ai.write.create_message({
  inputs: { user_message: prompt, model: "claude-haiku-4-5" },
});
// Zapier wraps the response — drill in to get the text
const item = (result.data as unknown[])[0] as { response: { content: { text: string }[] } };
return item.response.content[0].text;
