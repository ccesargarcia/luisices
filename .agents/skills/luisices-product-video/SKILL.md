---
name: luisices-product-video
description: >-
  Use when creating AI-generated marketing or explainer videos that describe the
  Luisices platform to prospective customers. Ground claims in the current product
  reference and preserve visual and feature accuracy; not for generic video work.
---

# Luisices AI Product Video

Create short, clear promotional explainers for prospective Luisices customers. The
skill's product reference is the approved source for what the platform currently
does. Do not invent features, workflows, integrations, results, prices, or guarantees.

## Source of truth

Before writing a script, read [product-facts.md](references/product-facts.md). For a
feature likely to have changed, confirm it in the linked current documentation and
implementation. The feature catalog is a maintained summary, not a substitute for
checking the current app. If sources conflict, prefer the current implementation and
flag the discrepancy instead of silently choosing the more attractive claim.

Distinguish these states in every deliverable:

- **Available:** verified in the current product implementation.
- **Conditional:** requires a permission, plan/configuration, external integration,
  or deployment in the target environment. State the condition when relevant.
- **Planned or unverified:** do not present as available. Omit from promotional
  scripts unless the user explicitly wants a roadmap video and it is clearly labeled.

## Video workflow

1. Identify the target viewer (for example, a personalized stationery atelier),
   their concrete pain point, the one product outcome to demonstrate, the channel,
   target duration, and the call to action. For an initial pilot, recommend one
   audience, one workflow, and roughly 60–90 seconds.
2. Select only the product facts needed to support that outcome. A video is not a
   feature inventory. Prefer a coherent story over a tour of every screen.
3. Write a spoken Portuguese script and a scene-by-scene storyboard. For each scene,
   include duration, voice-over, on-screen text, visual direction, and product facts
   being represented. Keep interface labels short and readable on a phone.
4. Generate the narration, supporting art/motion, captions, and music with AI tools
   available for the task. Use Brazilian Portuguese pronunciation and keep music
   below the narration. Do not imply that generated video can reliably render exact
   app text or controls.
5. When the Luisices interface appears, use user-provided or freshly captured screens
   from the current app with synthetic/demo data. Do not use customer records,
   messages, phone numbers, emails, payment details, tokens, or production secrets.
   AI may stylize transitions and backgrounds, but must not redraw interface details
   in a way that changes the real product behavior.
6. Assemble a finished MP4 with synchronized narration and captions. Also provide the
   script, storyboard, captions file (SRT or VTT if supported), and a thumbnail when
   the available tools support those outputs.
7. Review the video against the checklist below. Report any assumptions or
   unverified visual details before calling it ready.

## Accuracy and review checklist

- Each product claim maps to a fact in `references/product-facts.md` or a verified
  current implementation.
- UI scenes show the correct feature and use synthetic records; fictional values are
  visibly demo data when viewers could mistake them for real results.
- No unsupported claims about automatic actions, offline use, financial accuracy,
  production capacity, delivery guarantees, AI autonomy, integrations, pricing, or
  customer outcomes.
- Do not promise that AI enrichment is authoritative: suggestions need human review.
- Mention permissions/configuration only when the video demonstrates a feature whose
  availability is conditional. Do not burden a general marketing video with backend
  internals.
- Voice-over and captions agree, fit the duration, and remain legible on mobile.
- The closing call to action is the one requested by the user; do not invent a live
  signup, free trial, price, or contact channel.

## Pilot defaults

For the first Luisices explainer, a good candidate is the journey from receiving an
atelier order to organizing its items, tracking payment, and seeing its delivery
deadline. Use only the parts verified in the product reference. Keep the first video
focused; secondary modules such as Alexa, MCP/API, and administrative controls belong
in separate videos for audiences who need them.

If the request is to build a reusable video-generation product, rather than produce
one pilot, first provide a separate architecture proposal. This skill alone does not
authorize creating infrastructure, calling paid providers, publishing content, or
changing the Luisices application.
