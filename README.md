# Derycode Voice IDE

A voice-first, web-based IDE with AI-assisted development. Built with Next.js, Monaco Editor, and the Web Speech API.

## Vision

An IDE you control with your voice — open files, run commands, write code, and manage your project without touching a keyboard. Built for developers who want to code at the speed of thought.

## Architecture

```
derycode-voice-ide/
├── src/
│   ├── components/
│   │   ├── Editor.tsx          # Monaco Editor wrapper
│   │   ├── FileTree.tsx        # File explorer sidebar
│   │   ├── Terminal.tsx        # xterm.js terminal panel
│   │   ├── StatusBar.tsx       # Bottom status bar
│   │   ├── VoiceOverlay.tsx   # Voice input visualizer
│   │   ├── CommandPalette.tsx  # Cmd+K command palette
│   │   └── Toolbar.tsx         # Top toolbar
│   ├── hooks/
│   │   ├── useVoiceCommand.ts  # Speech recognition + intent parsing
│   │   ├── useFileSystem.ts    # Virtual file system
│   │   └── useEditor.ts        # Monaco editor state
│   ├── lib/
│   │   ├── voiceCommands.ts   # Voice command registry
│   │   ├── intentParser.ts     # NLU for voice commands
│   │   └── fileSystem.ts       # In-browser FS (IndexedDB)
│   ├── pages/
│   │   ├── _app.tsx
│   │   └── index.tsx           # Main IDE layout
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── tsconfig.json
└── next.config.js
```

## Implementation Plan

### Phase 1 — Foundation (Week 1-2)
- [ ] Project scaffolding (Next.js + TypeScript + Tailwind)
- [ ] Monaco Editor integration with syntax highlighting
- [ ] Basic layout: sidebar, editor, status bar
- [ ] File tree with create/delete/rename
- [ ] Tabbed editing

### Phase 2 — Virtual File System (Week 3)
- [ ] IndexedDB-backed file system
- [ ] File CRUD operations
- [ ] Project save/load
- [ ] Git integration (clone, commit, push via GitHub API)

### Phase 3 — Voice Engine (Week 4-5)
- [ ] Web Speech API integration (SpeechRecognition)
- [ ] Voice command registry
- [ ] Intent parser (NL → IDE action mapping)
- [ ] Voice feedback (SpeechSynthesis for confirmations)
- [ ] Commands: "open file", "create function", "run build", "go to line"
- [ ] Voice overlay UI with waveform visualization

### Phase 4 — Terminal & Execution (Week 6)
- [ ] xterm.js terminal panel
- [ ] Command execution (via WebSocket to backend)
- [ ] Voice-triggered commands: "run tests", "start server"
- [ ] Output streaming to terminal

### Phase 5 — AI Assistance (Week 7-8)
- [ ] Code completion (inline suggestions)
- [ ] Voice-triggered code generation
- [ ] Error explanation in natural language
- [ ] "Explain this function" voice command
- [ ] "Refactor this" voice command

### Phase 6 — Polish & Deploy (Week 9-10)
- [ ] Theme system (light/dark/custom)
- [ ] Keyboard shortcut layer (for hybrid use)
- [ ] Settings panel
- [ ] Performance optimization
- [ ] Deploy to Vercel/Netlify
- [ ] PWA support (installable, offline)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Editor | Monaco Editor (@monaco-editor/react) |
| Terminal | xterm.js |
| File System | IndexedDB (via idb library) |
| Voice Input | Web Speech API (SpeechRecognition) |
| Voice Output | Web Speech API (SpeechSynthesis) |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend | Node.js + WebSocket (for terminal/exec) |
| Deployment | Vercel |

## Voice Command Examples

```
"open main.tsx"           → Opens file in editor
"create new component"     → Creates a new React component
"go to line 42"            → Jumps cursor to line 42
"run build"                → Executes npm run build in terminal
"format this file"         → Formats current file
"search for useState"      → Global search
"commit changes"           → Git commit with message
"close tab"                → Closes active tab
"toggle sidebar"           → Shows/hides file tree
"explain this function"    → AI explains the function under cursor
```

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start talking to your IDE.

## License

MIT
