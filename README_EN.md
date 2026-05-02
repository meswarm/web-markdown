![Build Status](https://img.shields.io/github/actions/workflow/status/meswarm/web-markdown/ci.yml?branch=main)
![Version](https://img.shields.io/github/v/release/meswarm/web-markdown)
![License](https://img.shields.io/github/license/meswarm/web-markdown)

[![语言-中文](https://img.shields.io/badge/语言-中文-red)](README.md)
[![Language-English](https://img.shields.io/badge/Language-English-blue)](README_EN.md)

# Web Markdown Editor

> A WYSIWYG Markdown editor with local file system and rich media support

A modern Markdown editor built with React and Milkdown, featuring a full WYSIWYG editing experience, local media previews (images and videos), and direct read/write access to the local file system using the File System Access API.

## Features

- Local vault folder reading, editing, and saving
- Rendered mode and source mode
- Classified copy and preview for images, videos, and audio files
- Double-click image lightbox
- Collapsible code blocks with long-command wrapping
- NoteSys note formatting, image semantic extraction, and classified saving
- ragdata related-note search

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript |
| Framework | React, Vite |
| Markdown Engine | Milkdown |
| Storage & API | IndexedDB (idb-keyval), File System Access API, NoteSys, ragdata |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm / pnpm / yarn

### Installation

```bash
git clone https://github.com/meswarm/web-markdown.git
cd web-markdown
npm install
```

### Configuration

This project uses `.env.example` as a local backend template. Copy it and adjust the values for your environment:

```bash
cp .env.example .env
```

Defaults include:

- `VITE_NOTESYS_API_BASE`
- `VITE_RAGDATA_API_BASE`

`.env` contains local service URLs and should not be committed.

### Running locally

```bash
npm run dev
```

## Project Structure

```
.
├── src/
│   ├── components/       # React components (editor, sidebar, toolbar)
│   ├── plugins/          # Milkdown plugin extensions (e.g. media plugin)
│   ├── App.tsx           # Application entry and layout
│   └── ...
├── public/               # Static assets
└── index.html            # HTML template
```

## Usage

Start the app and explore the Markdown editing features in your browser:

1. Manage files using the left sidebar.
2. Type Markdown in the editor and view the live WYSIWYG result.
3. Use the toolbar for quick actions and saving files.

```bash
npm run build   # Build for production
npm run preview # Preview the production build
```

## Pre-Publish Checks

```bash
npm run build
node test-code-block-line-wrapping-config.js
node test-code-block-wrap-css.js
node test-editor-image-css.js
node --experimental-strip-types test-markdown-media-reference-preservation.js
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.
