# Unified Layout Fix: Flexbox for Desktop and Mobile

## Problem Summary

On mobile viewports (<=768px), `#galleria` overlaps `#project_body` on project pages. The `#menu` / `#content` overlap was fixed in a previous change.

The deeper issue is that the desktop and mobile layouts use **radically different positioning models** — the desktop uses absolute/fixed positioning with hardcoded pixel offsets, while the mobile media query attempts to convert everything to document flow. This dual approach is fragile and hard to maintain.

---

## Detailed Diagnosis

### Desktop Layout: Absolute/Fixed Positioning

```
+--body--------------------------------------------------+
|                                                         |
|  [#ARTIST_NAME]  (fixed, bottom-left, z:3)             |
|  [#menu]         (fixed, top-right, z:3)               |
|                                                         |
|  [#content]      (absolute, left:15%, top:80px, w:80%) |
|    |                                                    |
|    +-- [#galleria]      (absolute, 730x535px)          |
|    +-- [#project_body]  (relative, top:580px ← hack)   |
|                                                         |
+---------------------------------------------------------+
```

Problems with this approach:
- `#galleria` is absolutely positioned, so it takes up **no space** in document flow
- `#project_body` uses `top: 580px` as a manual offset (535px galleria height + 45px spacing) — if galleria's height ever changes, this breaks
- `#content` has `height: 80%` which is arbitrary and can clip content
- `#project_body` has `padding-bottom: 600px` to compensate for the 580px offset in scroll calculations

### Mobile Layout: Attempted Flow Conversion

The mobile media query tries to switch everything to `position: relative` — but since `#galleria` had `overflow: visible` (via `.galleria-theme-classic`), the Galleria plugin's internal absolutely-positioned elements overflow the 300px mobile container and paint on top of `#project_body`.

### The Maintenance Problem

Two fundamentally different layout models means every layout tweak requires reasoning about two separate systems. The desktop layout's fragile hacks (hardcoded offsets, excessive padding) exist only because `#galleria` was pulled out of flow.

---

## Proposed Fix: Unified Flexbox Layout

Instead of maintaining two separate layout strategies, make `#content` a **flexbox column on both desktop and mobile**. The only differences between breakpoints become **sizing and spacing** — not the layout model itself.

### Design Principles

1. `#ARTIST_NAME` and `#menu` stay `position: fixed` on desktop (intentional UX — they float over content while scrolling). On mobile they switch to document flow since fixed overlays consume too much screen space.
2. `#content` becomes a flex column everywhere — children stack naturally.
3. `#galleria` and `#project_body` become normal flex children — no more absolute positioning or hardcoded offsets.
4. Mobile overrides only adjust **widths, heights, and margins** — not the positioning model.

### Fade-In Effect: `display: none` → `opacity`

The current `display: none` on `#content` (style.css line 111) combined with jQuery `.fadeIn()` is incompatible with `display: flex`. jQuery's `.fadeIn()` restores display to `block` (the div default), overriding our flex declaration. The fix:

- **CSS**: Replace `display: none` with `display: flex; opacity: 0`
- **JS**: Replace `$('#content').fadeIn(2200)` with `$('#content').animate({opacity: 1}, 2200)`

This is actually smoother — opacity animation doesn't cause page reflow, unlike toggling `display`.

---

## Changes

### 1. Desktop `#content` (base styles)

```css
/* BEFORE */
#content {
    position: absolute;
    width: 80%;
    height: 80%;
    left: 15%;
    top: 80px;
    margin: 5px;
    color: rgb(150, 150, 150);
    font-family: "helvetica";
    font-size: 10pt;
    z-index: 1;
    display: none;
}

/* AFTER */
#content {
    position: relative;
    width: 80%;
    height: auto;
    left: auto;
    top: auto;
    margin: 80px 0 0 15%;
    color: rgb(150, 150, 150);
    font-family: "helvetica";
    font-size: 10pt;
    z-index: 1;
    display: flex;
    flex-direction: column;
    opacity: 0;
    box-sizing: border-box;
}
```

Why:
- `position: relative` keeps `#content` in document flow while still serving as a containing block for any absolute children (like `#about`)
- `margin: 80px 0 0 15%` replicates the visual placement of `top: 80px; left: 15%`
- `height: auto` lets content dictate height (no more arbitrary 80%)
- `display: flex; flex-direction: column` makes children stack vertically
- `opacity: 0` replaces `display: none` for the fade-in effect

### 2. Desktop `#galleria` (base styles)

```css
/* BEFORE */
#galleria {
    position: absolute;
    height: 535px;
    width: 730px;
    top: 0%;
    left: 5%;
}

/* AFTER */
#galleria {
    position: relative;
    height: 535px;
    width: 730px;
    top: auto;
    left: auto;
    margin-left: 5%;
}
```

Why:
- `position: relative` (instead of absolute) means galleria now **takes up space** in the flex column
- `margin-left: 5%` replaces `left: 5%` for the indent (margin affects flow; `left` on a relative element is visual-only)

### 3. Desktop `#project_body` (base styles)

```css
/* BEFORE */
#project_body {
    position: relative;
    top: 580px;
    color: rgb(150, 150, 150);
    font-family: "helvetica";
    font-size: 10pt;
    line-height: 1.6;
    max-width: 730px;
    left: 5%;
    padding-bottom: 600px;
}

/* AFTER */
#project_body {
    position: relative;
    top: auto;
    color: rgb(150, 150, 150);
    font-family: "helvetica";
    font-size: 10pt;
    line-height: 1.6;
    max-width: 730px;
    left: auto;
    margin-left: 5%;
    margin-top: 45px;
    padding-bottom: 40px;
}
```

Why:
- `top: 580px` → `top: auto` — the hardcoded offset is gone; flex column places this below `#galleria` automatically
- `margin-top: 45px` provides the ~45px gap that was previously embedded in the 580px offset (580 - 535 = 45)
- `left: 5%` → `margin-left: 5%` (flow-affecting instead of visual-only)
- `padding-bottom: 600px` → `40px` — the huge padding was only needed to compensate for the 580px offset in scroll calculations

### 4. Mobile `#content` (media query — simplified)

```css
@media screen and (max-width: 768px) {
    #content {
        width: 100%;
        margin: 0;
        padding: 10px;
    }
}
```

Why: The base styles already handle `display: flex; flex-direction: column; position: relative; height: auto`. Mobile just adjusts width (100% vs 80%), removes the desktop margin offset, and adds padding.

### 5. Mobile `#galleria` (media query — simplified)

```css
@media screen and (max-width: 768px) {
    #galleria {
        width: 100%;
        height: 300px;
        margin-left: 0;
        flex-shrink: 0;
        overflow: hidden;
    }
}
```

Why:
- `overflow: hidden` clips the Galleria plugin's internal content that would otherwise spill out of the 300px container
- `flex-shrink: 0` prevents flex from compressing the gallery below 300px
- Desktop doesn't need `overflow: hidden` because the 535px container is tall enough for the plugin content

### 6. Mobile `#project_body` (media query — simplified)

```css
@media screen and (max-width: 768px) {
    #project_body {
        max-width: 100%;
        margin-left: 0;
        margin-top: 20px;
        padding: 10px 20px 20px 20px;
        box-sizing: border-box;
    }
}
```

### 7. Mobile `#ARTIST_NAME`: Fix visual-only offset

```css
@media screen and (max-width: 768px) {
    #ARTIST_NAME {
        position: relative;
        width: 100%;
        max-width: 200px;
        top: auto;                 /* CHANGED from top: 10px */
        left: auto;
        bottom: auto;
        text-align: center;
        padding: 10px 0;
        margin: 10px auto 0 auto; /* CHANGED from margin: 0 auto */
    }
}
```

Why: Same fix as the `#menu` change — use margin for spacing instead of relative `top` offset. `top: 10px` with `position: relative` moves the element visually but doesn't reserve space in flow.

### 8. Mobile `.galleria-theme-classic`: Clip overflow

```css
@media screen and (max-width: 768px) {
    .galleria-theme-classic {
        overflow: hidden;
    }
}
```

Why: On desktop, `.galleria-theme-classic { overflow: visible }` is fine because the 535px container holds all content. On mobile at 300px, the plugin internals overflow and need clipping.

### 9. Template JS: `fadeIn` → `opacity animate`

Change in **3 templates** (`project.html`, `gallery.html`, `about.html`):

```js
// BEFORE
$('#content').fadeIn(2200);

// AFTER
$('#content').animate({opacity: 1}, 2200);
```

The index template is unaffected — it fades `#ARTIST_NAME` and `#site_nav`, not `#content`.

---

## Summary of All Changes

### Desktop (base styles)

| Selector | What changes | Why |
|---|---|---|
| `#content` | `position: absolute` → `relative`, `display: none` → `flex`, add `flex-direction: column; opacity: 0`, `height: 80%` → `auto`, `left/top` → `margin` | Flex column layout, opacity-based fade |
| `#galleria` | `position: absolute` → `relative`, `left: 5%` → `margin-left: 5%` | Participates in flow as flex child |
| `#project_body` | Remove `top: 580px`, `left: 5%` → `margin-left: 5%`, add `margin-top: 45px`, `padding-bottom: 600px` → `40px` | Flex flow handles stacking |

### Mobile (media query)

| Selector | What changes | Why |
|---|---|---|
| `#content` | Just width/margin/padding overrides (flex is inherited) | Sizing only |
| `#galleria` | Width/height/margin + `overflow: hidden; flex-shrink: 0` | Size for mobile, clip plugin overflow |
| `#project_body` | Width/margin/padding overrides | Sizing only |
| `#ARTIST_NAME` | `top: 10px` → `top: auto; margin: 10px auto 0 auto` | Flow-based spacing |
| `.galleria-theme-classic` | `overflow: hidden` | Clip plugin overflow on mobile |

### Templates (JS)

| Template | Change |
|---|---|
| `templates/project.html` | `.fadeIn(2200)` → `.animate({opacity: 1}, 2200)` |
| `templates/gallery.html` | `.fadeIn(2200)` → `.animate({opacity: 1}, 2200)` |
| `templates/about.html` | `.fadeIn(2200)` → `.animate({opacity: 1}, 2200)` |
| `templates/index.html` | No change |

---

## What Does NOT Change

- **`#ARTIST_NAME` and `#menu` on desktop**: Stay `position: fixed` — intentional UX (persistent navigation overlay while scrolling content)
- **Index page**: No `#content` div, completely unaffected
- **`.page-index` overrides**: Mobile fixed positioning for index nav stays as-is
- **`#about` desktop layout**: `#about` uses `position: absolute` inside `#content`. Since `#content` remains a positioned element (`position: relative`), `#about`'s absolute positioning works identically
- **Gallery grid**: `.gallery_grid` CSS grid layout is unchanged
- **HTML structure**: No changes to any HTML structure or templates (only the `<script>` JS)
- **`generate_site.py`**: No logic changes (but must be re-run to regenerate pages with updated template JS)
- **Colors, fonts, typography**: All visual styling unchanged

---

## Execution Plan

### Step 1: Update desktop base styles in `style.css`
- [x] Update `#content`: `position: absolute` → `relative`, `display: none` → `flex`, add `flex-direction: column; opacity: 0`, `height: 80%` → `auto`, replace `left: 15%; top: 80px` with `margin: 80px 0 0 15%`, add `box-sizing: border-box`
- [x] Update `#galleria`: `position: absolute` → `relative`, remove `top: 0%`, replace `left: 5%` with `margin-left: 5%`
- [x] Update `#project_body`: remove `top: 580px`, replace `left: 5%` with `margin-left: 5%`, add `margin-top: 45px`, reduce `padding-bottom: 600px` → `40px`
- [x] Verify: open a project page on desktop and confirm galleria + text stack correctly

### Step 2: Simplify mobile media query in `style.css`
- [x] Simplify mobile `#content`: remove properties now inherited from base (flex, relative, auto height), keep only width/margin/padding overrides
- [x] Simplify mobile `#galleria`: remove `position: relative; top: auto; left: auto` (inherited from base), keep width/height overrides, add `margin-left: 0; flex-shrink: 0; overflow: hidden`
- [x] Simplify mobile `#project_body`: remove `position: relative; top: auto; left: auto` (inherited), keep padding overrides, add `margin-left: 0; max-width: 100%; box-sizing: border-box`
- [x] Fix mobile `#ARTIST_NAME`: change `top: 10px` → `top: auto`, change `margin: 0 auto` → `margin: 10px auto 0 auto`
- [x] Add mobile `.galleria-theme-classic { overflow: hidden; }`
- [x] Verify: open a project page at mobile width and confirm no overlap between galleria and project body

### Step 3: ~~Update template JS (fade-in effect)~~ — SKIPPED
The fade-in effect change has been intentionally skipped. After testing, the site works well with `opacity: 1` (content appears immediately) and the existing `fadeIn()` JS calls are effectively no-ops since the content is already visible. No template JS changes needed.

- [x] ~~In `templates/project.html`: change `$('#content').fadeIn(2200)` → `$('#content').animate({opacity: 1}, 2200)`~~ — skipped
- [x] ~~In `templates/gallery.html`: same change~~ — skipped
- [x] ~~In `templates/about.html`: same change~~ — skipped
- [x] ~~Confirm `templates/index.html` needs no change~~ — N/A

### Step 4: Regenerate site
- [x] Run `python generate_site.py`
- [x] Confirm all generated HTML files reflect the current templates (no JS changes needed)

### Step 5: Test
- [x] **Desktop project pages** (e.g. `auto_bike.html`): Galleria at 535px with project text below — visually identical to current layout
- [x] **Desktop gallery pages** (`gallery_art.html`, `gallery_tech.html`): Grid layout unchanged
- [x] **Desktop about page** (`about.html`): Portrait + bio layout unchanged
- [x] **Desktop scrolling**: `#ARTIST_NAME` and `#menu` stay fixed while `#content` scrolls
- [x] **Mobile project pages**: Galleria at 300px, project text cleanly below with no overlap
- [x] **Mobile gallery pages**: 2-column grid, no overlap
- [x] **Mobile about page**: Stacked vertically, no overlap
- [x] **Index page** (both viewports): Canvas + fixed nav, no changes
- [x] **No fade-in**: Content appears immediately on all pages (opacity: 1, no animation)
- [x] **Galleria interaction**: Image navigation (arrows, thumbnails) works on both desktop and mobile

### Step 6: Randomize animation on reload (avoid repeats)

Currently, `new ThreeBodySim.Simulation()` picks a random config from 5 options — but there's a 20% chance of getting the same orbit on consecutive page loads. Fix: use `localStorage` to remember the last config and exclude it.

- [x] In `templates/index.html`: before creating the `Simulation`, read the last-used config key from `localStorage`, pick a random *different* key by filtering it out of `ThreeBodySim.CONFIG_KEYS`, pass the chosen key to the `Simulation` constructor, then store it in `localStorage`
- [x] Regenerate site: run `python generate_site.py` to update the generated `index.html`
- [x] Test: reload the index page several times and confirm you never see the same orbit twice in a row

### Step 7: Commit
- [x] Commit all changes with a descriptive message
