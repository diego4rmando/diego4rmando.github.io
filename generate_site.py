#!/usr/bin/env python3
"""
Site generator script for diego4rmando.github.io

This script reads project markdown files from the /projects directory,
parses their YAML frontmatter, and generates:
1. A JSON data file with all project metadata
2. HTML pages for each project

Usage:
    python generate_site.py

Categories are discovered dynamically from subfolder names under /projects/.
The script expects the following directory structure:
    /projects
    ├── /{category}
    │   └── /project_name
    │       ├── project.md
    │       └── images...
    └── /{category}
        └── /project_name
            ├── project.md
            └── images...
"""

import json
import os
import re
from pathlib import Path
from datetime import date
from typing import Optional, Tuple, Dict, List

import markdown


def parse_frontmatter(content: str) -> Tuple[dict, str]:
    """
    Parse YAML frontmatter from markdown content.

    Args:
        content: The full markdown file content

    Returns:
        A tuple of (frontmatter_dict, body_content)
    """
    # Match YAML frontmatter between --- markers
    pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(pattern, content, re.DOTALL)

    if not match:
        return {}, content

    yaml_content = match.group(1)
    body = match.group(2).strip()

    # Simple YAML parser for our specific format
    frontmatter = {}
    current_key = None
    current_list = None
    current_item = None

    lines = yaml_content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip empty lines
        if not line.strip():
            i += 1
            continue

        # Check for list item (starts with "  - ")
        if line.startswith('  - '):
            if current_list is not None:
                # Save previous item if exists
                if current_item is not None:
                    current_list.append(current_item)
                # Start new item
                current_item = {}
                # Parse the first property of the item
                item_content = line[4:]  # Remove "  - "
                if ':' in item_content:
                    key, value = item_content.split(':', 1)
                    current_item[key.strip()] = value.strip().strip('"')
        # Check for list item property (starts with "    ")
        elif line.startswith('    ') and current_item is not None:
            item_content = line.strip()
            if ':' in item_content:
                key, value = item_content.split(':', 1)
                current_item[key.strip()] = value.strip().strip('"')
        # Check for top-level key
        elif ':' in line and not line.startswith(' '):
            # Save previous list if exists
            if current_list is not None and current_key is not None:
                if current_item is not None:
                    current_list.append(current_item)
                frontmatter[current_key] = current_list
                current_list = None
                current_item = None

            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()

            if value == '':
                # This might be a list
                current_key = key
                current_list = []
            else:
                # Regular key-value pair
                frontmatter[key] = value.strip('"')
                current_key = key

        i += 1

    # Don't forget the last list/item
    if current_list is not None and current_key is not None:
        if current_item is not None:
            current_list.append(current_item)
        frontmatter[current_key] = current_list

    return frontmatter, body


def get_image_base_path(category: str, project_folder: str) -> str:
    """
    Get the base path for images based on category and project.
    Images are stored alongside project.md files.
    """
    return f'projects/{category}/{project_folder}'


def load_project(project_path: Path, category: str) -> Optional[dict]:
    """
    Load a single project from its markdown file.

    Args:
        project_path: Path to the project directory
        category: The category folder name (e.g. 'art', 'tech')

    Returns:
        Project dictionary or None if invalid
    """
    md_file = project_path / 'project.md'
    if not md_file.exists():
        print(f"Warning: No project.md found in {project_path}")
        return None

    content = md_file.read_text(encoding='utf-8')
    frontmatter, body = parse_frontmatter(content)

    if not frontmatter.get('title'):
        print(f"Warning: No title in {md_file}")
        return None

    project_folder = project_path.name
    image_base = get_image_base_path(category, project_folder)

    # Build project data
    project = {
        'id': project_folder,
        'title': frontmatter.get('title', ''),
        'date': frontmatter.get('date', ''),
        'description': frontmatter.get('description', ''),
        'thumbnail': f"{image_base}/{frontmatter.get('thumbnail', '')}",
        'category': category,
        'body': body,
        'has_article': frontmatter.get('article', '').lower() == 'true',
        'images': []
    }

    # Process images
    for img in frontmatter.get('images', []):
        project['images'].append({
            'file': f"{image_base}/{img.get('file', '')}",
            'thumb': f"{image_base}/{img.get('thumb', '')}",
            'title': img.get('title', ''),
            'caption': img.get('caption', '')
        })

    return project


def discover_categories(projects_dir: Path) -> List[str]:
    """
    Discover project categories dynamically from subfolder names under /projects/.
    Returns sorted list of category names.
    """
    categories = []
    if not projects_dir.exists():
        print(f"Warning: {projects_dir} does not exist")
        return categories

    for entry in sorted(projects_dir.iterdir()):
        if entry.is_dir() and not entry.name.startswith('.'):
            categories.append(entry.name)

    return categories


def load_all_projects(base_path: Path) -> dict:
    """
    Load all projects from the projects directory.

    Returns:
        Dictionary mapping category names to lists of projects.
        Categories are discovered dynamically from folder names.
    """
    projects_dir = base_path / 'projects'
    categories = discover_categories(projects_dir)
    projects = {cat: [] for cat in categories}

    for category in categories:
        category_dir = projects_dir / category

        for project_path in sorted(category_dir.iterdir()):
            if project_path.is_dir():
                project = load_project(project_path, category)
                if project:
                    projects[category].append(project)

        # Sort by date (newest first)
        projects[category].sort(key=lambda p: p.get('date', 0), reverse=True)

    return projects


def generate_json(projects: dict, output_path: Path) -> None:
    """
    Write projects data to a JSON file.
    """
    output = {
        'generated': str(date.today()),
        'projects': projects
    }

    output_path.write_text(
        json.dumps(output, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )
    print(f"Generated: {output_path}")



def generate_gallery_html(project: dict) -> str:
    """
    Generate HTML for the image gallery.
    """
    lines = []
    for img in project['images']:
        caption = img['caption']

        lines.append(f'''        <a href="{img['file']}">
            <img
                src="{img['thumb']}"
                data-big="{img['file']}"
                data-title="{img['title']}"
                data-description="{caption}"
            >
        </a>''')
    return '\n'.join(lines)


def generate_nav_html(projects: dict) -> str:
    """
    Generate the site navigation HTML: links to category gallery pages plus About.
    """
    lines = ['<div id="site_nav">']
    for category in sorted(projects.keys()):
        display_name = category.replace('_', ' ').title()
        lines.append(f'<a href="gallery_{category}.html">{display_name}</a> / ')
    lines.append('<a href="about.html">About</a>')
    lines.append('</div>')
    return '\n'.join(lines)


def generate_gallery_items_html(projects: dict, category: str) -> str:
    """
    Generate HTML for the thumbnail grid items on a category gallery page.
    Projects are already sorted by date (newest first) from load_all_projects.
    """
    lines = []
    for project in projects[category]:
        project_id = project['id']
        title = project['title']
        date_str = project.get('date', '')
        thumbnail = project.get('thumbnail', '')
        html_file = f"{project_id}.html"
        lines.append(f'''<div class="gallery_item">
<a href="{html_file}#{project_id}">
<img src="{thumbnail}" alt="{title}">
<div class="gallery_item_title">{title}</div>
<div class="gallery_item_date">{date_str}</div>
</a>
</div>''')
    return '\n'.join(lines)



def generate_article_html(project: dict, projects: dict, article_template: str, base_path: Path) -> None:
    """
    Generate a separate article HTML page for a project that has article content.
    The article content is read from article.md in the project directory.
    """
    article_md = base_path / 'projects' / project['category'] / project['id'] / 'article.md'
    if not article_md.exists():
        print(f"Warning: article.md not found for {project['id']}")
        return

    article_body = article_md.read_text(encoding='utf-8')

    extra_head = ''
    if '\\[' in article_body or '\\(' in article_body:
        extra_head = '<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML" async></script>'

    nav_html = generate_nav_html(projects)

    html = article_template
    html = html.replace('{{ARTICLE_TITLE}}', project['title'])
    html = html.replace('{{ARTICLE_BODY}}', article_body)
    html = html.replace('{{NAV_MENU}}', nav_html)
    html = html.replace('{{EXTRA_HEAD}}', extra_head)

    output_path = base_path / f"{project['id']}_article.html"
    output_path.write_text(html, encoding='utf-8')
    print(f"Generated article: {output_path}")


def generate_project_html(project: dict, projects: dict, template: str, base_path: Path,
                          article_template: Optional[str] = None) -> None:
    """
    Generate an HTML file for a single project.
    If the project has article: true, also generates a separate article page.
    """
    # Generate gallery HTML
    gallery_html = generate_gallery_html(project)

    # Project body content (the markdown body rendered as HTML)
    body_html = project.get('body', '')

    # Extra head content (e.g. MathJax for projects with LaTeX)
    extra_head = ''
    if '\\[' in body_html or '\\(' in body_html:
        extra_head = '<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML" async></script>'

    # Generate nav
    nav_html = generate_nav_html(projects)

    # Replace placeholders in template
    html = template
    html = html.replace('{{NAV_MENU}}', nav_html)
    html = html.replace('{{GALLERY_IMAGES}}', gallery_html)
    html = html.replace('{{PROJECT_BODY}}', body_html)
    html = html.replace('{{EXTRA_HEAD}}', extra_head)

    # Write the HTML file
    output_path = base_path / f"{project['id']}.html"
    output_path.write_text(html, encoding='utf-8')
    print(f"Generated: {output_path}")

    # Generate separate article page if this project has one
    if project.get('has_article') and article_template:
        generate_article_html(project, projects, article_template, base_path)


def generate_about_content(base_path: Path) -> str:
    """
    Read about.md and convert it to HTML using the markdown library.
    """
    about_md_path = base_path / 'about.md'
    if not about_md_path.exists():
        print(f"Warning: about.md not found at {about_md_path}")
        return ''

    md_content = about_md_path.read_text(encoding='utf-8')
    md = markdown.Markdown(extensions=['tables', 'attr_list'])
    return md.convert(md_content)


def generate_standalone_page(template_name: str, projects: dict, base_path: Path) -> None:
    """
    Generate a standalone page (index.html, about.html) from its template.
    Replaces {{NAV_MENU}} with dynamically generated navigation HTML.
    For about.html, also reads about.md and injects converted HTML content.
    """
    template_path = base_path / 'templates' / template_name
    if not template_path.exists():
        print(f"Warning: Template not found: {template_path}")
        return

    template = template_path.read_text(encoding='utf-8')
    nav_html = generate_nav_html(projects)
    html = template.replace('{{NAV_MENU}}', nav_html)

    if template_name == 'about.html':
        about_html = generate_about_content(base_path)
        html = html.replace('{{ABOUT_CONTENT}}', about_html)

    output_path = base_path / template_name
    output_path.write_text(html, encoding='utf-8')
    print(f"Generated: {output_path}")


def generate_category_gallery_page(category: str, projects: dict, gallery_template: str, base_path: Path) -> None:
    """
    Generate a gallery page for a single category (e.g. gallery_art.html).
    Shows all projects in a responsive thumbnail grid.
    """
    nav_html = generate_nav_html(projects)
    gallery_items_html = generate_gallery_items_html(projects, category)
    display_name = category.replace('_', ' ').title()

    html = gallery_template
    html = html.replace('{{GALLERY_TITLE}}', display_name)
    html = html.replace('{{NAV_MENU}}', nav_html)
    html = html.replace('{{GALLERY_ITEMS}}', gallery_items_html)

    output_path = base_path / f"gallery_{category}.html"
    output_path.write_text(html, encoding='utf-8')
    print(f"Generated gallery: {output_path}")


def generate_all_html(projects: dict, base_path: Path) -> None:
    """
    Generate all HTML files: project pages, article pages, and standalone pages.
    All pages are generated from templates in /templates/.
    """
    template_path = base_path / 'templates' / 'project.html'
    if not template_path.exists():
        print(f"Error: Template not found at {template_path}")
        return

    template = template_path.read_text(encoding='utf-8')

    # Load article template if it exists
    article_template_path = base_path / 'templates' / 'article.html'
    article_template = None
    if article_template_path.exists():
        article_template = article_template_path.read_text(encoding='utf-8')

    # Generate project pages
    for category in projects:
        for project in projects[category]:
            generate_project_html(project, projects, template, base_path, article_template)

    # Generate category gallery pages
    gallery_template_path = base_path / 'templates' / 'gallery.html'
    if gallery_template_path.exists():
        gallery_template = gallery_template_path.read_text(encoding='utf-8')
        for category in projects:
            generate_category_gallery_page(category, projects, gallery_template, base_path)

    # Generate standalone pages from templates
    standalone_pages = ['index.html', 'about.html']
    for page_name in standalone_pages:
        generate_standalone_page(page_name, projects, base_path)


def main():
    # Get the directory where this script is located
    base_path = Path(__file__).parent.resolve()

    print(f"Loading projects from: {base_path / 'projects'}")

    # Load all projects
    projects = load_all_projects(base_path)

    for category, project_list in projects.items():
        print(f"Found {len(project_list)} {category} projects")

    # Generate JSON output
    output_path = base_path / 'data' / 'projects.json'
    output_path.parent.mkdir(exist_ok=True)
    generate_json(projects, output_path)

    # Generate HTML files
    print("\nGenerating HTML files...")
    generate_all_html(projects, base_path)

    print("\nDone!")


if __name__ == '__main__':
    main()
