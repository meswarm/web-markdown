![Build Status](https://img.shields.io/github/actions/workflow/status/OWNER/REPO/ci.yml?branch=main)
![Version](https://img.shields.io/github/v/release/OWNER/REPO)
![License](https://img.shields.io/github/license/OWNER/REPO)

[![语言-中文](https://img.shields.io/badge/语言-中文-red)](README.md)
[![Language-English](https://img.shields.io/badge/Language-English-blue)](README_EN.md)

# Web Markdown Editor

> A WYSIWYG Markdown editor with local file system and rich media support

A modern Markdown editor built with React and Milkdown, featuring a full WYSIWYG editing experience, local media previews (images and videos), and direct read/write access to the local file system using the File System Access API.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript |
| Framework | React, Vite |
| Markdown Engine | Milkdown |
| Storage & API | IndexedDB (idb-keyval), File System Access API |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm / pnpm / yarn

### Installation

```bash
git clone https://github.com/meswarm/web-markdown.git
cd REPO
npm install
```

### Configuration

No specific environment variables are required currently. If needed in the future, you can copy the example:

```bash
# cp .env.example .env
```

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feat/your-feature`)
5. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.
