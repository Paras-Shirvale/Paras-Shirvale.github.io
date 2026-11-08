# Paras Shirvale — Personal Website

Live at **https://paras-shirvale.github.io**

A content-driven portfolio: every piece of text, image and link lives in **one file**, so you can update the site without touching HTML or CSS.

## How to update content

Edit **[`assets/js/content.js`](assets/js/content.js)**. Search for `TODO` to find placeholders.

| What you want to change | Key in `content.js` |
|---|---|
| Name, email, résumé link, "open to work" badge | `meta` |
| Big intro screen (greeting, typing roles, photo) | `hero` |
| Big numbers strip | `stats` |
| About text and quick facts | `about` |
| Research & publications | `research` |
| Projects (`featured: true` shows on home page) | `projects` |
| Skills and certifications | `skills`, `certifications` |
| Music / theatre / writing cards | `passions` |
| Photos | `gallery` |
| Rotating quotes | `quotes` |
| Contact text and form | `contact`, `socials` |

- Put images in `assets/images/` and your CV at `assets/resume.pdf`.
- Setting any list to `[]` hides that section.
- **Contact form:** create a free form at [formspree.io](https://formspree.io) and paste its URL into `contact.formEndpoint`. If you leave it empty, the form opens the visitor's email app.
- **Accent colour:** change `--accent` at the top of `assets/css/style.css`.

## Structure

```
index.html        Home: hero, about, research, projects, skills, beyond, gallery, quotes, contact
projects.html     All projects, with category filters
gallery.html      Full photo gallery with lightbox
assets/
  css/style.css   All styles (light/dark themes)
  js/content.js   ← YOUR CONTENT
  js/main.js      Renders the content, animations, theme toggle
  images/
```

`Experience.html`, `contact.html` and `blogs_photos.html` redirect to the new pages, so old links still work.

## Preview locally

Open `index.html` in a browser, or run `python -m http.server` and visit http://localhost:8000.
