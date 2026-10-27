# Rukhshana & Ruzbeh — digital wedding card

Static site. No build step, no backend. Upload this folder to any static host.

## Preview locally

```bash
python3 ../serve_preview.py --port 8769
```

Then open http://127.0.0.1:8769/ (byte ranges are needed for video seeking; a plain
`python3 -m http.server` also works for everything except seeking).

## Personalised links

Add the guest or family name to the link:

    https://your-host/?guest=Meher%20%26%20family

The envelope reads "For Meher & family" and the RSVP name is prefilled.

## RSVP delivery

Open `app.js` and fill one of the two values at the top:

- `RSVP_ENDPOINT` — a URL that accepts a JSON POST (Google Apps Script, a form
  backend, a webhook). The page sends `{guest, name, attending, partySize, foodNotes,
  message, submittedAt}`.
- `RSVP_WHATSAPP` — a number with country code, digits only. The reply opens in
  WhatsApp as a prefilled message.

With neither set, guests see their composed reply with Share and Copy buttons.

## Family photos

Put JPEGs in `assets/family/` using the exact names in `assets/family/README.txt`.
The portrait slots appear automatically when a file exists.

## Files

- `index.html`, `styles.css`, `app.js` — the whole card
- `assets/card-1..4.webp` — the printed card pages (PNG originals alongside)
- `assets/opening.mp4` — 9.4 s opening film, cut from the watercolor car clips
- `assets/our-story-wc.mp4`, `assets/our-story-mobile-wc.mp4` — the full film, landscape and portrait
- `assets/score.m4a` — the score played during the opening
- `assets/wedding.ics` — calendar file
- `assets/fonts/` — Great Vibes and Libre Baskerville (OFL licences included)
