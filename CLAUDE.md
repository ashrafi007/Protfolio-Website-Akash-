# CLAUDE.md — Intazar Akash modeling portfolio

Static portfolio site for **S M Intazar Ahmed Akash** (display name / wordmark: **INTAZAR AKASH**), a Dhaka-based model: fashion, commercial, TVC, OVC, runway. Height 6'0" / 183 cm. Brand face for **Hazzel Fashion**. Full plan and approved copy: `docs/blueprint.md`.

## Stack
- Plain HTML + CSS + vanilla JS. No build step, no framework, no dependencies at runtime.
- `index.html` — all six views in one file; `script.js` swaps views by URL hash.
- `styles.css` — design tokens on `:root`, dark mode via `prefers-color-scheme` and `[data-theme]`.
- `config.js` — **contact details (email, WhatsApp, Instagram) live here only.** Empty values stay hidden on the site.
- Fonts: Bodoni Moda (display) + Inter (body) from Google Fonts.
- Preview locally: `python -m http.server 8000` then open http://localhost:8000

## Structure
```
index.html, styles.css, script.js, config.js
assets/images/*.webp        web images (generated)
assets/video/*.mp4          720x900 H.264 clips (generated)
assets/Intazar-Akash-CompCard-2026.pdf   two-sided A5 comp card (generated)
source/photos, source/video originals (gitignored, keep a backup)
tools/process_media.py      originals -> assets (Pillow + ffmpeg)
tools/make_compcard.py      builds comp card PDF (reportlab, fonts in tools/fonts)
docs/blueprint.md           site plan, copy, CTA strategy, checklist
```

## Views (hash routes)
`#home`, `#portfolio` (tabs: fashion / commercial / brand), `#motion` (showreel plays the 3 clips in sequence + clip grid), `#digitals` (empty state until digitals are shot), `#about` (bio, stats, experience, hair range strip), `#book` (brief form + direct contacts + comp card).
Without JS, all views render stacked (`html.js` class gates the view hiding).

## Booking form
No backend. On submit it validates, composes a plain-text brief, then offers "Send on WhatsApp" (wa.me link) and/or "Send by email" (mailto) based on `config.js`, plus "Copy brief". If a real form backend is wanted later, Netlify Forms or Formspree are the simplest drop-ins.

## Design rules (keep these)
- Gallery-white, image-led. Off-white `#F7F5F2`, ink `#1B1A18`, no accent colour; photos carry the colour.
- Max two images per row on desktop, one on mobile. No filters, borders, shadows or auto-playing sliders.
- Never crop the feet off full-length shots; height is the main selling point.
- Hero: full-length sepia suit shot with the oversized serif name overlapping its right edge.
- Every page ends with one clear CTA; the header Book button is always visible.
- Images as WebP around 300 KB max; strip EXIF/location (process_media.py does this).
- Typographic apostrophes and quotes in visible copy; straight " for inches.

## Photo decisions
- Used: suit-sepia (hero, lead image), denim-bun (best face shot), denim-seated, yellow-wall (strongest colour), beach-sleeve, beach-smile, panjabi (Brand Work).
- `hotel-lobby-unused.jpg` is deliberately excluded: flip-flops, security staff in frame and flash lighting read as personal, not professional.
- ASSUMPTION to confirm: the panjabi photo is shown as Hazzel Fashion brand work. Swap it if it is not from that campaign.
- The three clips have descriptive captions only (no client names yet).

## Open TODOs
- [ ] Fill `config.js` with email, WhatsApp (digits with 880 country code) and Instagram handle.
- [ ] Add measurements (chest, waist, inseam, suit, shoe, eye colour) to the About stats table and `STATS` in `tools/make_compcard.py`, then rebuild the comp card.
- [ ] Shoot digitals and a clean headshot; replace the Digitals empty state with a dated grid, and use the headshot on About and the comp card back.
- [ ] Get official Hazzel Fashion campaign images + year + permission to use the name/logo.
- [ ] Film a 10–15 s runway walk for the Motion page.
- [ ] Photographer / stylist credits for each image (lightbox caption).
- [ ] Domain (e.g. intazarakash.com) + deploy (see README.md), then update canonical/OG tags.
- [ ] Add Open Graph tags + share image so the link previews well on Instagram, WhatsApp and email.

## Regenerating assets
```
pip install -r tools/requirements.txt   # ffmpeg must be installed separately
python tools/process_media.py
python tools/make_compcard.py
```
