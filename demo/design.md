# Dispatch — video design system

Mood: calm, credible, human. A dark Slack-like workspace that feels organized and trustworthy,
with one warm human accent for the "for good" stakes. Product-walkthrough energy — confident, not flashy.

## Palette
- `--bg` `#15161d`        — near-black aubergine/charcoal (Slack-dark feel), primary background
- `--surface` `#1f2129`   — raised panels / cards
- `--surface-2` `#2a2d38` — message bubbles, chips
- `--fg` `#e9eaf0`        — primary text
- `--muted` `#9aa0b4`     — secondary text / metadata
- `--blue` `#1f6feb`      — Dispatch brand accent (links, key highlights, the agent)
- `--blue-soft` `#3b82f6` — secondary blue for glows/strokes
- `--green` `#2ea44f`     — ✅ resolved / success
- `--amber` `#f0a830`     — urgency / human-warmth accent (the "for good" beat)
- `--line` `#343845`      — hairline borders/dividers

## Typography
- Primary: `Inter` — UI, body, labels (matches Slack's clean sans)
- Weights: 700/800 for display headlines, 600 for emphasis, 400/500 for body & UI
- `font-variant-numeric: tabular-nums` on any times/IDs
- Display headlines 90–150px; section titles 48–64px; body 24–34px; UI/chrome 18–22px

## Corners & depth
- Cards/panels: 16px radius. Chips/buttons: 8px. Message bubbles: 10px.
- Depth = subtle: soft shadows + a localized blue glow behind the agent/card at key moments. No heavy gradients on the dark bg (use radial/solid + glow to avoid H.264 banding).

## Motion
- Confident and smooth: power3.out / expo.out for entrances; short 0.3–0.6s. Crossfade between beats.
- The "thinking" stream is the signature motion — status lines replace one another with a soft slide+fade, like a real agent reasoning.

## What NOT to do
- No full-screen linear gradients on dark bg. No neon/rainbow. No more than the palette above.
- Don't fake metrics or claims — every on-screen string mirrors the real product output.
- No jump cuts; every beat enters; only the final beat fades out.
