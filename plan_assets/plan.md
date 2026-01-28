
# Objective
The objective of this project is to update my personal website that displays the different art and technology projects I have done over the years.

## Issues to solve

### Technical issues
* Currently the website is not mobile friendly
* The website is hand-crafted. Every time I want to add a new item to the website, I need to go in and change the HTML code directly.

### Design issues
* The front page is currently "blank" with just a slowly shifting gradient. I would like to add an animation or interactive element.
* Technical and Art projects should be in time order. It is hard for viewers to know what the latest projects are

## Scope
* **In scope**: Front page redesign with animation, content management system, mobile responsiveness
* **Out of scope**: Gallery page redesign (keep current style, focus on front page)
* **Target browsers**: Modern browsers only (latest Chrome, Firefox, Safari, Edge)

# Website Design
I propose a design that is as follows.

The front page of the website will display ASCII objects animated as point masses orbiting a central "sun" (the About object) according to gravitational laws. Only the central sun exerts gravitational pull on the other objects — objects do not affect each other. This keeps the physics computation O(n) rather than O(n²) while still producing visually compelling orbital motion. Initial velocities and slight random perturbations will keep orbits varied and natural-looking.

![Front Page Drawing](drawings_concept.png)

* The __background__ gradient colors wil be similar to the old website simulating a sky moving from day to night to day. But now the colors will go through a more thorough "night" phase.
* The __stars__ will each represent and link to one project on the website. Each project declares its own ASCII character in its `project.md` metadata (e.g. `*` for art, `O` for tech — but this is data, not code). Categories are not hard-coded; they are derived from the folder names under `/projects/`.
* One object, slightly larger than the other ones will be the __sphere__ which will link to the about page.
* All objects will change in color as the background changes to make sure they are visible. The objects will be lighter colored at night (to look like celestial objects) and darker in the daytime (darker objects against a lighter background).
* When the mouse hovers over an item moving around (thus "catching" it) the object will stop and display an icon to represent the project. Clicking on the object will open up a gallery to display the object.
* **Mobile interaction**: On touch devices, users tap an object to "catch" it (same behavior as hover on desktop).
* **Artist name on mobile**: The name "DIEGO ARMANDO PLASCENCIA VEGA" must always display stacked as two lines (`DIEGO ARMANDO` / `PLASCENCIA VEGA`), matching the desktop layout. On mobile the name container is constrained to a `max-width` that forces this wrap.
* There will still be a "menu" like the current design which shows three options:

                                {CATEGORY_1} / {CATEGORY_2} / ... / ABOUT

    * The menu is generated dynamically from the category folder names under `/projects/`, plus a fixed ABOUT link. No categories are hard-coded.
    * The menu will be displayed on the top right of the page
    * Clicking the about page will simply transition you to the "about" page with information about me (similar to the current about page)
    * **Desktop**: Clicking a category tab will result in only the corresponding objects fading away and lining up in chronological order leading you to a "gallery" in which you can view the different projects (similarly to how the website works now). The accordion menu remains as-is.
    * **Mobile**: Instead of the accordion, the menu displays simple links to dedicated **category gallery pages** (one per category, e.g. `gallery_art.html`, `gallery_tech.html`). Each gallery page shows all projects in that category as a responsive thumbnail grid sorted chronologically. This avoids the accordion pushing content off-screen on small devices.

## Accessibility
* The dynamically generated category menu (plus ABOUT) will always be visible and fully keyboard-navigable
* Menu items will have proper focus states and ARIA labels for screen readers
* Users who cannot see the animation can still navigate the site via the menu


# Technical Approach

## Site Generation
I would like to build the structure of this website once, and then be able to add/remove/reorganize content easily without restructuring it. The approach we can take is to set up a file structure (similarly to what exists now) which includes images and markdown files and then auto-generate the website by running a **custom Python script**.

### File Structure
Categories are not hard-coded. Any subfolder of `/projects/` is treated as a category (e.g. `art`, `tech`, or anything added in the future). The generator script discovers categories dynamically by scanning folder names.

```
/projects
├── /{category_1}
│   └── /project_name
│       ├── project.md
│       ├── thumbnail.png
│       ├── image1.png
│       └── image2.png
└── /{category_2}
    └── /project_name
        ├── project.md
        ├── thumbnail.png
        ├── image1.png
        └── image2.png
```

### Project Metadata
Each `project.md` file will contain YAML frontmatter with the following fields:
```yaml
---
title: "Project Title"
date: 2024-01-15
description: "A brief description of the project"
thumbnail: "thumbnail.png"
ascii_char: "*"
---

Full project description in markdown...
```

The `ascii_char` field determines what character represents this project in the front-page animation. This is per-project metadata, not derived from the category — giving full flexibility to change characters without changing code.

Adding content should be as easy as adding some files to the file structure, running the Python script, opening a PR, reviewing and pushing (without changing the core code). Adding a new *category* is equally simple: create a new folder under `/projects/` and the generator and front-end will pick it up automatically.

## Front-end Animation
* **Technology**: HTML Canvas for rendering the gravitational animation
* **Expected objects**: 10-25 project objects on screen at once
* **Performance**: Single-attractor physics model (O(n) per frame) ensures smooth Canvas animation for this number of objects on both desktop and mobile

# Execution Plan
The creation of the new website should happen in the following steps, stopping at each to test the new functionality manually and adding a commit at each step of the way.

## Phase 1: Content Management System ✅
- [x] Design and create the `/projects` file structure with sample projects
- [x] Create project.md template with YAML frontmatter (title, date, description, thumbnail)
- [x] Build Python script to parse project files and generate site data (JSON)
- [x] Integrate generated data with existing HTML templates
- [x] Test: Add/remove a project and regenerate site
- [x] Migrate all 11 projects (8 art, 3 tech) to markdown + colocated images
- [x] Remove hard-coded categories — generator discovers categories dynamically from folder names

## Phase 2: Mobile Responsiveness ✅
- [x] Audit current CSS for mobile breakpoints
- [x] Add viewport meta tag to template and standalone pages (about.html, index.html)
- [x] Implement responsive media queries (≤768px breakpoint) for menu, content, galleria, about page
- [ ] Test on iPhone and various screen sizes (manual testing needed)

## Phase 2b: Mobile Navigation Improvements
- [ ] Fix artist name stacking: constrain `#ARTIST_NAME` `max-width` in the mobile media query so "DIEGO ARMANDO / PLASCENCIA VEGA" always wraps to two lines
- [ ] Create a `gallery` HTML template for category gallery pages (responsive thumbnail grid, sorted by date)
- [ ] Update `generate_site.py` to generate one gallery page per category (e.g. `gallery_art.html`, `gallery_tech.html`)
- [ ] On mobile (≤768px), replace the accordion menu with simple links to the category gallery pages (plus About)
- [ ] Keep accordion behavior unchanged on desktop
- [ ] Test gallery pages on mobile and desktop

## Phase 3: Front Page Animation
Build in layers, testing each before moving to the next:

### 3a. Background Gradient
- [ ] Implement day/night gradient cycle on Canvas
- [ ] Ensure colors transition smoothly through night phase

### 3b. Object Rendering
- [ ] Render each project's ASCII character (from `ascii_char` metadata) on Canvas
- [ ] Implement color changes based on background (light at night, dark in day)
- [ ] Add the larger "sphere" object for the About link

### 3c. Physics Simulation
- [ ] Implement gravitational attraction from the central "sun" (About object) to all project objects (single-attractor model, O(n) per frame)
- [ ] Add varied initial velocities and slight random perturbations to prevent uniform orbits
- [ ] Tune mass/distance parameters for visually pleasing orbital motion
- [ ] Verify smooth performance with 10-25 objects on both desktop and mobile

### 3d. Interactions
- [ ] Desktop: Hover to catch object, display project icon
- [ ] Mobile: Tap to catch object, display project icon
- [ ] Click/tap on caught object opens gallery
- [ ] Menu click on any category transitions those objects to chronological lineup
- [ ] Ensure menu remains keyboard-accessible throughout

