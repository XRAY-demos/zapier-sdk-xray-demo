# Switching AI Providers with Zapier SDK

The AI prompt in this app is handled by a single block of code inside `generateBrief()` in `src/zapier.ts`. Swapping providers means replacing that block. Here's how to do it for any provider available on Zapier.

---

## Step 1 — Add a connection in Zapier

Go to https://zapier.com/app/assets/connections and connect your chosen AI provider. You'll need an API key from that provider.

---

## Step 2 — Find the app key

Run this in the project root to search for your provider by name:

```bash
node -e "
const { createZapierSdk } = require('@zapier/zapier-sdk');
const zapier = createZapierSdk();
zapier.listApps({ search: 'YOUR PROVIDER NAME' }).then(r =>
  r.data.forEach(a => console.log(a.key, '|', a.title))
).catch(e => console.error(e.message));
"
```

Note the `key` value — you'll need it for the next steps.

---

## Step 3 — Find the right action

List all write actions for the app to find the one that sends a prompt:

```bash
node -e "
const { createZapierSdk } = require('@zapier/zapier-sdk');
const zapier = createZapierSdk();
zapier.listActions({ appKey: 'YOUR_APP_KEY', pageSize: 50 }).then(r =>
  r.data.filter(a => a.action_type === 'write')
       .forEach(a => console.log(a.key, '|', a.title))
).catch(e => console.error(e.message));
"
```

---

## Step 4 — Find the input fields

Check what inputs the action expects:

```bash
node -e "
const { createZapierSdk } = require('@zapier/zapier-sdk');
const zapier = createZapierSdk();
zapier.listInputFields({ appKey: 'YOUR_APP_KEY', actionKey: 'YOUR_ACTION_KEY', actionType: 'write' }).then(r =>
  r.data.forEach(f => console.log(f.key, '|', f.title))
).catch(e => console.error(e.message));
"
```

To see only required fields:

```bash
node -e "
const { createZapierSdk } = require('@zapier/zapier-sdk');
const zapier = createZapierSdk();
zapier.listInputFields({ appKey: 'YOUR_APP_KEY', actionKey: 'YOUR_ACTION_KEY', actionType: 'write' }).then(r =>
  r.data.filter(f => f.is_required)
       .forEach(f => console.log(f.key, '|', f.title))
).catch(e => console.error(e.message));
"
```

---

## Step 5 — Update generateBrief() in src/zapier.ts

Replace the contents of `generateBrief()` with this pattern, filling in your values:

```ts
export async function generateBrief(
  zapier: ZapierClient,
  connections: Connection[],
  prompt: string
): Promise<string> {
  console.log("  Provider: YOUR PROVIDER");
  const conn = findConnection(connections, "YOUR_APP_KEY", "");
  const ai = zapier.apps.your_app_name({ connectionId: conn.id });
  const result = await ai.write.your_action_key({
    inputs: { your_prompt_field: prompt, model: "your-model-id" },
  });
  // Log result.data[0] to inspect the response shape, then drill in to the text field:
  return ((result.data as unknown[])[0] as { your_text_field: string }).your_text_field;
}
```

---

## Step 6 — Check the response shape

The field name for the generated text differs between providers. Add this line before your return to inspect what comes back:

```ts
console.log(JSON.stringify((result.data as unknown[])[0], null, 2));
```

Find the field that contains the text, update your return line, then remove the log.
