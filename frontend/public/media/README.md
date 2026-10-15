# Background art

Every page ships with a still background image (duotoned to the app's neon
teal/green palette from the biotech reference art): DNA helix on the landing
page, molecule cluster on the assessment page, cell/virus cluster on the
results page — `hero-bg.jpg`, `assessment-bg.jpg`, `results-bg.jpg`.

The landing page also has a looping video (`hero-bg.mp4`, a DNA strand loop)
layered faintly over its still image. **Video is deliberately landing-page-only
for now** — assessment/results keep just the still image, kept calm since
those pages are for reading and filling in a form.

## Adding video to another page later

Drop a file in with the same base name as the page's image, `.mp4` instead of
`.jpg` (`assessment-bg.mp4`, `results-bg.mp4`), and wire it into the
`BACKDROPS` map at the top of `src/App.jsx` the same way `/` is already
wired — `{ image: '...', video: '...' }`. `src/components/BackgroundImage.jsx`
handles the rest: it fades the video in once it can play, and falls back to
the still image if the file is missing or fails to load, so nothing ever
breaks either way.

Guidelines so a video doesn't fight the glass UI and particle field on top of
it:
- Keep it dark/desaturated — teal or green tones match best; the app dims it
  further with a gradient anyway, and plays it back quite faintly on purpose
  (kept subtle, not the main visual).
- 10–20 second seamless loops, muted, no important detail in the center third
  (that's where the glass cards and text sit).
- Reasonable file size — 1080p H.264, under ~15MB per clip is a good target.

To swap the still images themselves (different art, different crop, etc.),
just replace the `.jpg` files with the same names — no code changes needed.
