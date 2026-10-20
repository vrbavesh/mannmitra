# Landing surface

Mode: Persuade. Audience: young-adult Indian users exploring mental wellbeing screening and self-help. Primary action: begin signup. Product truth comes from `mannmitra-master-spec.md.md`; the visual direction is the user's supplied `plans/MannMitra – Fluid Glass.html`.

## Direction contract

**THESIS:** Preserve the supplied spacious fluid-glass composition, with a living orb connecting five sections and immediate signup/sign-in entry points.

**OWN-WORLD:** One light theme, cool mint background, deep teal text and pills, translucent navigation and program sheet. System typography matches the reference. Orb iridescence is decorative artwork, not additional UI accents.

**STORY:** Understand the screening, discover the thirty-day rhythm, see examples of activities, and start a check-in. Screening is not a diagnosis; professional support remains findable.

**FIRST VIEWPORT:** Fixed brand and two account links; large left-aligned headline and short supporting copy; primary pill and secondary text link. Floating glass orb occupies the right half on desktop and upper third on mobile. No scroll interception.

**FORM:** User-selected source HTML, no random seed or generated comp. Port its interaction code: spring-smoothed orb position/scale, grab/grabbing cursors, press compression, rubber-band drag, release velocity and spin, and proximity lift across neighbouring days. Use a slightly slower 0.6s home response instead of the source's 0.5s, as requested in the user's interaction correction.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Necessary adaptations

- Odd days are main practices; even days are 1–3 minute activities; day 30 is the post-test. The reference's inverted day pattern and full days off are corrected to the spec.
- Screening results guide track assignment. Mood is recorded around activities; it does not select a different track each day.
- Add the required privacy, terms and support footer. Preserve the user's CTA labels and full navigation at phone widths; two links fit without a hamburger.
- Keep content visible before JavaScript. Reduced motion, data saving and low-power devices use a static orb. No dark theme or blur animation. UI transitions stay below 300ms and use transform/opacity.
- Procedural artwork needs no downloaded images or raster assets. The source HTML is the visual reference, not executable production code.
