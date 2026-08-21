import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface FileEntry {
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  parentId?: string;
  createdAt: number;
  updatedAt: number;
}

interface FileDB extends DBSchema {
  files: {
    key: string;
    value: FileEntry;
    indexes: { 'by-parent': string; 'by-path': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'derycode-ide';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FileDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FileDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FileDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const fileStore = db.createObjectStore('files', { keyPath: 'path' });
        fileStore.createIndex('by-parent', 'parentId');
        fileStore.createIndex('by-path', 'path');
        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

export const fileSystem = {
  async getAll(): Promise<FileEntry[]> {
    const db = await getDB();
    return db.getAll('files');
  },

  async getByPath(path: string): Promise<FileEntry | undefined> {
    const db = await getDB();
    return db.get('files', path);
  },

  async getChildren(parentId: string): Promise<FileEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex('files', 'by-parent', parentId);
  },

  async create(entry: FileEntry): Promise<void> {
    const db = await getDB();
    await db.put('files', entry);
  },

  async update(path: string, updates: Partial<FileEntry>): Promise<void> {
    const db = await getDB();
    const existing = await db.get('files', path);
    if (existing) {
      await db.put('files', { ...existing, ...updates, updatedAt: Date.now() });
    }
  },

  async delete(path: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('files');
    const toDelete = all.filter(f => f.path === path || f.path.startsWith(path + '/'));
    for (const entry of toDelete) {
      await db.delete('files', entry.path);
    }
  },

  async rename(oldPath: string, newPath: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAll('files');
    const toRename = all.filter(f => f.path === oldPath || f.path.startsWith(oldPath + '/'));
    for (const entry of toRename) {
      const updatedPath = entry.path === oldPath ? newPath : entry.path.replace(oldPath, newPath);
      const updatedName = updatedPath.split('/').pop() || entry.name;
      await db.delete('files', entry.path);
      await db.put('files', { ...entry, path: updatedPath, name: updatedName, updatedAt: Date.now() });
    }
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('files');
  },

  async seedSampleProject(): Promise<void> {
    const db = await getDB();
    const existing = await db.count('files');
    if (existing > 0) return;

    const now = Date.now();
    const samples: FileEntry[] = [
      { path: '/src', name: 'src', type: 'folder', parentId: '/', createdAt: now, updatedAt: now },
      { path: '/src/index.tsx', name: 'index.tsx', type: 'file', parentId: '/src', content: `import { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <h1>Derycode Voice IDE</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(count + 1)}>+</button>\n    </div>\n  );\n}\n`, createdAt: now, updatedAt: now },
      { path: '/src/utils.ts', name: 'utils.ts', type: 'file', parentId: '/src', content: `export function debounce<T extends (...args: any[]) => void>(\n  fn: T,\n  delay: number\n): (...args: Parameters<T>) => void {\n  let timer: ReturnType<typeof setTimeout>;\n  return (...args: Parameters<T>) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n}\n\nexport function formatDate(date: Date): string {\n  return new Intl.DateTimeFormat('en-US', {\n    year: 'numeric',\n    month: 'short',\n    day: 'numeric',\n  }).format(date);\n}\n`, createdAt: now, updatedAt: now },
      { path: '/src/types.ts', name: 'types.ts', type: 'file', parentId: '/src', content: `export interface Project {\n  name: string;\n  version: string;\n  files: string[];\n}\n\nexport type ThemeName = 'dark' | 'light' | 'midnight' | 'solarized';\n`, createdAt: now, updatedAt: now },

      // Runnable samples
      { path: '/examples', name: 'examples', type: 'folder', parentId: '/', createdAt: now, updatedAt: now },
      { path: '/examples/hello.js', name: 'hello.js', type: 'file', parentId: '/examples', content: `// JavaScript — click Run to execute\nconsole.log("Hello, World!");\n\nconst numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconsole.log("Doubled:", doubled);\n\nconst sum = numbers.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);\n\n// Try modifying and running again!\n`, createdAt: now, updatedAt: now },
      { path: '/examples/fibonacci.py', name: 'fibonacci.py', type: 'file', parentId: '/examples', content: `# Python — click Run to execute (loads Pyodide on first run)\ndef fibonacci(n):\n    a, b = 0, 1\n    result = []\n    for _ in range(n):\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nprint("Fibonacci sequence:")\nprint(fibonacci(15))\n\n# Try changing the number and run again!\n`, createdAt: now, updatedAt: now },
      { path: '/examples/typescript-demo.ts', name: 'typescript-demo.ts', type: 'file', parentId: '/examples', content: `// TypeScript — click Run to compile and execute\ninterface User {\n  name: string;\n  age: number;\n  email: string;\n}\n\nconst users: User[] = [\n  { name: "Alice", age: 28, email: "alice@example.com" },\n  { name: "Bob", age: 34, email: "bob@example.com" },\n  { name: "Charlie", age: 22, email: "charlie@example.com" },\n];\n\nconst adults = users.filter(u => u.age >= 25);\nconsole.log("Adults:", adults.map(u => u.name).join(", "));\n\nconst averageAge = users.reduce((sum, u) => sum + u.age, 0) / users.length;\nconsole.log("Average age:", averageAge);\n`, createdAt: now, updatedAt: now },
      { path: '/examples/preview.html', name: 'preview.html', type: 'file', parentId: '/examples', content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>Live Preview</title>\n  <style>\n    body {\n      font-family: system-ui, sans-serif;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      min-height: 100vh;\n      margin: 0;\n      background: linear-gradient(135deg, #667eea, #764ba2);\n      color: white;\n    }\n    .card {\n      padding: 32px;\n      border-radius: 16px;\n      background: rgba(255, 255, 255, 0.1);\n      backdrop-filter: blur(10px);\n      text-align: center;\n    }\n    h1 { margin: 0 0 8px; font-size: 28px; }\n    p { margin: 0; opacity: 0.8; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Live HTML Preview</h1>\n    <p>Edit this file and click Run to see changes.</p>\n  </div>\n</body>\n</html>\n`, createdAt: now, updatedAt: now },
      { path: '/examples/styles.css', name: 'styles.css', type: 'file', parentId: '/examples', content: `/* CSS — click Run to see a live preview */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #0f0f1e;\n  color: #e0e0f0;\n}\nh1 {\n  color: #7c83ff;\n  font-size: 32px;\n}\nbutton {\n  background: linear-gradient(135deg, #7c83ff, #9aa0ff);\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 8px;\n  cursor: pointer;\n  font-size: 14px;\n}\nbutton:hover {\n  transform: translateY(-2px);\n}\n`, createdAt: now, updatedAt: now },
      { path: '/examples/data.json', name: 'data.json', type: 'file', parentId: '/examples', content: `{\n  "name": "Derycode Voice IDE",\n  "version": "0.3.0",\n  "features": [\n    "voice control",\n    "in-browser compiler",\n    "mobile-first design",\n    "Monaco editor",\n    "IndexedDB file system"\n  ],\n  "supportedLanguages": [\n    "JavaScript",\n    "TypeScript",\n    "Python",\n    "HTML",\n    "CSS",\n    "JSON"\n  ]\n}\n`, createdAt: now, updatedAt: now },

      { path: '/package.json', name: 'package.json', type: 'file', parentId: '/', content: `{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n`, createdAt: now, updatedAt: now },
      { path: '/README.md', name: 'README.md', type: 'file', parentId: '/', content: '# Derycode Voice IDE\n\nA voice-first, mobile-first web-based IDE with an in-browser compiler.\n\n## Features\n\n- Voice control (Web Speech API)\n- In-browser compiler for JavaScript, TypeScript, Python, HTML, CSS, and JSON\n- Mobile-first responsive design with bottom navigation\n- Monaco Editor with syntax highlighting\n- IndexedDB file system (files persist across reloads)\n- Four color themes\n\n## Getting Started\n\n1. Click the Voice button or use the command palette (Ctrl+K)\n2. Open a file from the file tree\n3. Click Run to compile and execute your code\n4. Say "run code" or "compile" to run via voice\n\n## Voice Commands\n\nSay things like:\n- "open file hello.js"\n- "create file utils.py"\n- "run code"\n- "go to line 15"\n- "toggle terminal"\n- "theme solarized"\n- "format code"\n', createdAt: now, updatedAt: now },
    ];

    for (const entry of samples) {
      await db.put('files', entry);
    }
  },

  async getSetting(key: string): Promise<any> {
    const db = await getDB();
    return db.get('settings', key);
  },

  async setSetting(key: string, value: any): Promise<void> {
    const db = await getDB();
    await db.put('settings', value, key);
  },
};
