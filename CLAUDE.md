# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static portfolio website for diegoapv.com (Diego Armando Plascencia Vega). Uses a Python-based static site generator to produce HTML from templates and project markdown files. No Node.js, no build tools — just Python + vanilla JS. Hosted on GitHub Pages.

## Build Command

```bash
python generate_site.py
```

This is the only build step. It reads project markdown files, generates `data/projects.json`, and renders all HTML pages. Run from the project root. Both generated HTML files and templates are committed to the repo.

## Architecture

### Content Pipeline

```
projects/{category}/{project_id}/project.md  →  generate_site.py  →  {project_id}.html
                                                                   →  data/projects.json
                                                                   →  gallery_{category}.html
                                                                   →  index.html, main.html, about.html
```

- **Categories are auto-discovered** from folder names under `projects/` (currently `art` and `tech`)
- **Project metadata** lives in YAML frontmatter of each `project.md`
- **Templates** in `templates/` use `{{PLACEHOLDER}}` syntax (simple string replacement, no templating engine)
- If a project has `article: "true"` in frontmatter, the generator also produces `{id}_article.html` from an `article.md` file in the project folder

### Key Files

- `generate_site.py` — the entire build system; reads markdown, renders templates, writes HTML and JSON
- `templates/project.html` — template for individual project pages (with Galleria image gallery)
- `templates/gallery.html` — template for category gallery pages
- `templates/index.html`, `templates/main.html`, `templates/about.html` — standalone page templates
- `style.css` — all styles; mobile breakpoint at 768px switches from fixed left sidebar to top navigation
- `data/projects.json` — generated metadata for all projects

### Template Placeholders

Common across templates:
- `{{ACCORDION_MENU}}` — nested sidebar menu HTML for all categories/projects
- `{{MOBILE_NAV}}` — simplified mobile navigation links
- `{{ACCORDION_ACTIVE}}` — 0-indexed integer for which accordion section to expand
- `{{EXTRA_HEAD}}` — optional script includes (e.g., MathJax when LaTeX detected)

### Frontend Libraries (in `js/`)

- jQuery, jQuery UI 1.12.1 (accordion widget), Galleria 1.4.7 (image carousel), MathJax 2.7.5 (optional, loaded dynamically)

## Adding a New Project

1. Create `projects/{category}/{project_id}/`
2. Add `project.md` with YAML frontmatter (`title`, `date`, `description`, `thumbnail`, `images` array)
3. Add thumbnail and image files
4. Run `python generate_site.py`

## Project Frontmatter Format

```yaml
---
title: "Project Title"
date: 2024
description: "Short description for galleries"
thumbnail: "thumbnail.png"
article: "true"          # optional — triggers article page generation
images:
  - file: "image.png"
    thumb: "image_thumb.png"
    title: "Display Title"
    caption: "Caption text"
---
```

## Development Workflow

This website is being developed following the plan in `plan_assets/plan.md`. That file contains the full design vision, technical specifications, and a phased **Execution Plan** with checkboxes tracking progress.

When completing work on a step or phase, update the Execution Plan section in `plan_assets/plan.md` to mark the relevant items as done. Before starting new work, read the plan to understand what has been completed and what comes next.

When a user indicates that a phase (ex 4) or sub-phase (4a) is complete, add all code to a commit with a message indicating what was changed and what phase the commit completes. 