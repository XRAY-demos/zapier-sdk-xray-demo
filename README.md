# Morning Brief — Zapier SDK Demo

A demo app that delivers a personalized morning brief to Slack — built to show how the [Zapier SDK](https://zapier.com/developer/documentation/v2/zapier-sdk/) lets you connect any app, including AI providers, without managing API keys or writing integration boilerplate.

## What it does

On each run, the app:
1. Fetches today's calendar events, unread emails (last 24h), and open Airtable tasks — all via the Zapier SDK
2. Sends that data to an AI model to produce a concise, Slack-formatted summary
3. DMs the brief to a specified Slack user

## Architecture

```
src/index.ts    ← orchestrates the run
src/zapier.ts   ← all Zapier SDK calls (Calendar, Gmail, Airtable, ChatGPT, Slack)
```

All integrations — including the AI call — go through the Zapier SDK. No provider API keys needed.

## Swapping AI providers

The AI call lives entirely in `generateBrief()` in `src/zapier.ts`. Switching providers means replacing that one function. See [`docs/switching-providers.md`](docs/switching-providers.md) for a step-by-step guide, and [`docs/anthropic-reference.ts`](docs/anthropic-reference.ts) for a ready-to-paste Anthropic block.

## Setup

### Prerequisites
- Node.js 18+
- A [Zapier](https://zapier.com) account with active connections for Gmail, Google Calendar, Airtable, ChatGPT, and Slack

### Install

```bash
git clone https://github.com/mattjasinski/morning-brief.git
cd morning-brief
npm install
cp .env.example .env
```

### Configure `.env`

```env
# Airtable base and table to pull tasks from
AIRTABLE_BASE_ID=app...
AIRTABLE_TABLE_ID=tbl...

# Slack user ID to receive the morning brief DM
SLACK_USER_ID=U...

# Email address associated with your Google connections in Zapier
ZAPIER_CONNECTION_EMAIL=you@example.com

# Slack workspace handle (used to find the right Slack connection)
SLACK_WORKSPACE=your-workspace
```

No AI provider API keys — those are managed through your Zapier connections.

### Run

```bash
npm start
```

## Example output

```
*Good morning!*

*Today's Meetings*
• 9:00 AM — Weekly Sync with Product (60 min)
• 2:00 PM — 1:1 with Sarah

*Unread Emails*
• Alex Chen — "Q2 budget approval needed by EOD"
• Finance Team — "Invoice #4821 requires your signature"

*Open Tasks*
• Finalize slide deck for Thursday demo
• Review contractor SOW
```

## Extending it

Want a different AI provider? See [`docs/switching-providers.md`](docs/switching-providers.md).

Want different data sources? Add calls in `src/zapier.ts` using any of Zapier's 7,000+ app integrations.
