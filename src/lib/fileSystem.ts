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
    // Delete file and all children if folder
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
      { path: '/package.json', name: 'package.json', type: 'file', parentId: '/', content: `{\n  "name": "my-project",\n  "version": "1.0.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build"\n  }\n}\n`, createdAt: now, updatedAt: now },
      { path: '/README.md', name: 'README.md', type: 'file', parentId: '/', content: '# My Project\n\nBuilt with **Derycode Voice IDE**.\n\nSay "start listening" to control the IDE with your voice.\n', createdAt: now, updatedAt: now },
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
