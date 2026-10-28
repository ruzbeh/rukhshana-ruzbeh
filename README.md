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

The envelope reads "Specially for Meher & family", page 1 reads "invite Meher & family to share their joy", and the RSVP name is prefilled.

## Family selection

Choose the family when sharing the link: `?family=ruzbeh` or `?family=rukhshana`. `family=groom` and `family=bride` also work. Only the selected person appears. No large opening popup is shown.

### Existing side links

Use `?guest=Meher%20%26%20family&side=ruzbeh` for Ruzbeh’s relatives, or
`?guest=Meher%20%26%20family&side=rukhshana` for Rukhshana’s relatives.
`side=groom` and `side=bride` also work. Links with no assigned family show no host guide.
No family relationship is inferred from a guest’s name.

Guidance starts before the guest acts, with no speech box or extra button. The host
demonstrates the gold seal’s movement automatically; tapping opens the envelope immediately.
On the card, the host lifts and pulls the corner, holds it up, and sets it back down.
This repeats gently until the guest successfully turns a page. Touch interrupts the
hint immediately; a tap, scroll, or unfinished swipe lets it resume after idle.
Once the guest turns a page, the lesson stays out of the way. Reduced motion skips
these demonstrations.
The reaching and page-turn sprites in `assets/guides/` were created using the built-in
imagegen tool and the existing caricatures as identity references.

## RSVP delivery

Open `app.js` and fill one of the two values at the top:

- `RSVP_ENDPOINT` — a URL that accepts a JSON POST. The page sends `{guest, name, attending, partySize, guests, message, submittedAt}`.
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
- `assets/our-story-wc5.mp4`, `assets/our-story-mobile-wc5.mp4` — the full film, landscape and portrait
- `assets/score.m4a` — bright piano-led score (`wedding-film/motion-v3/music/bright-piano-v3g.wav`, rebuild with `wan-film/scripts/swap_score.py`), plays from the envelope tap through the film; the films carry the same cue as their fallback audio
- `assets/wedding.ics` — calendar file
- `assets/fonts/` — Great Vibes and Libre Baskerville (OFL licences included)

## Household meal preferences

Each attending guest supplies a name and one meal: Parsi non veg, Parsi veg, Jain veg, or Veg. The reply contains `guests: [{name, meal}]`; party size matches this list. Declines send an empty list and party size zero. No Google Form is used. Delivery configuration remains pending the owner's instructions; replies can currently be shared or copied.

Use repeated `guest` parameters or semicolon-separated names for individual invitees (up to six names fit on the cover), for example `?guest=Meher%20Patwa&guest=Cyrus%20Patwa`. These names are invitation text; the RSVP collects the actual attendees separately.

Feedback revision uses the 21-second `our-story-wc5.mp4` and `our-story-mobile-wc5.mp4` films: full Rukhshana name, a single three-second coastal drive, and corrected venue spelling.

Page-turn controls are visually hidden until keyboard focus, and remain available to screen readers. Both wc5 film endings use “and”.

## RSVP screens

The RSVP moves through attendance, party size with an illustrated table, individual names and meals, and a final review. Back preserves entries. Declines skip party and meal screens. The table illustrates party size; it does not assign seating. `rsvp.css` contains the RSVP-specific layout and must be included alongside `styles.css` and `app.js`.


## Film-to-card handoff

The site plays `our-story-wc7.mp4` / `our-story-mobile-wc7.mp4` (16.75 seconds). These end on the moving coastal scene and reveal the live HTML invitation directly. The earlier wc6 files contain a four-second static invitation ending and are retained only as source history. Rebuild using `../scripts/remove_static_film_ending.py`.


## Return to the envelope

A deliberate backward swipe on the first page closes the invitation into its envelope. The same gesture on later pages returns to the previous page. Arrow Left and the accessible Previous/Close control follow the same rule. Small drags, vertical scrolling and cancelled touches leave the card open. Reopening starts at page 1 and preserves the RSVP draft.

## Family invitation wording

`?family=ruzbeh` (or `family=groom`, `side=ruzbeh`, `side=groom`) shows Aban and Soli Irani as hosts, Ruzbeh first, and his blessings and compliments. `?family=rukhshana` (or `family=bride`, and matching `side` aliases) retains the Patwa invitation and family lists. Unassigned links retain the original bride-family card. Guest personalization works with either family.
