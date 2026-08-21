import { useState } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { ChevronRight, ChevronDown, File as FileIcon, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react';

interface TreeNode {
  _entry: any;
  _children: Record<string, TreeNode>;
}

export function FileTree() {
  const files = useIDEStore(s => s.files);
  const activeTab = useIDEStore(s => s.activeTab);
  const openFile = useIDEStore(s => s.openFile);
  const expandedFolders = useIDEStore(s => s.expandedFolders);
  const toggleFolder = useIDEStore(s => s.toggleFolder);
  const createFile = useIDEStore(s => s.createFile);
  const deleteFile = useIDEStore(s => s.deleteFile);
  const [creating, setCreating] = useState<{ parent: string; name: string } | null>(null);

  const sortEntries = (entries: [string, TreeNode][]) =>
    entries.sort(([a, na], [b, nb]) => {
      const aFolder = na._entry?.type === 'folder' || Object.keys(na._children).length > 0;
      const bFolder = nb._entry?.type === 'folder' || Object.keys(nb._children).length > 0;
      if (aFolder !== bFolder) return aFolder ? -1 : 1;
      return a.localeCompare(b);
    });

  const buildTree = (): Record<string, TreeNode> => {
    const root: Record<string, TreeNode> = {};
    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];
        if (!current[key]) {
          current[key] = { _entry: null, _children: {} };
        }
        if (i === parts.length - 1) {
          current[key]._entry = file;
        }
        current = current[key]._children;
      }
    }
    return root;
  };

  const renderNode = (name: string, node: TreeNode, depth: number, parentPath: string) => {
    const entry = node._entry;
    const path = entry?.path || `${parentPath}/${name}`;
    const isFolder = entry?.type === 'folder' || Object.keys(node._children).length > 0;
    const isExpanded = expandedFolders.has(path);
    const isActive = activeTab === path;

    return (
      <div key={path}>
        <div
          className={clsx(
            'flex items-center gap-1 px-2 py-1 text-xs cursor-pointer select-none hover:bg-ide-surface-hover/50 transition-colors group',
            isActive ? 'bg-ide-surface text-ide-accent' : 'text-ide-text'
          )}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => isFolder ? toggleFolder(path) : openFile(path)}
        >
          {isFolder ? (
            <>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {isExpanded ? <FolderOpen size={14} className="text-ide-warning" /> : <Folder size={14} className="text-ide-warning" />}
            </>
          ) : (
            <>
              <span style={{ width: 12 }} />
              <FileIcon size={14} className="text-ide-muted" />
            </>
          )}
          <span className="truncate flex-1">{name}</span>
          <div className="hidden group-hover:flex items-center gap-1">
            {isFolder && (
              <button
                onClick={(e) => { e.stopPropagation(); setCreating({ parent: path, name: '' }); }}
                className="text-ide-muted hover:text-ide-accent"
              >
                <Plus size={11} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); deleteFile(path); }}
              className="text-ide-muted hover:text-ide-danger"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
        {isFolder && isExpanded && (
          <>
            {creating && creating.parent === path && (
              <div style={{ paddingLeft: `${(depth + 1) * 14 + 6}px` }} className="py-0.5">
                <input
                  autoFocus
                  className="bg-ide-bg border border-ide-accent rounded px-1 py-0.5 text-xs w-3/4 outline-none text-ide-text"
                  placeholder="filename.ts"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) createFile(`${path}/${val}`);
                      setCreating(null);
                    } else if (e.key === 'Escape') {
                      setCreating(null);
                    }
                  }}
                  onBlur={() => setCreating(null)}
                />
              </div>
            )}
            {sortEntries(Object.entries(node._children))
              .map(([childName, childNode]) => renderNode(childName, childNode, depth + 1, path))}
          </>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="h-full overflow-y-auto py-1">
      {creating && creating.parent === '/' && (
        <div className="px-2 py-0.5">
          <input
            autoFocus
            className="bg-ide-bg border border-ide-accent rounded px-1 py-0.5 text-xs w-3/4 outline-none text-ide-text"
            placeholder="filename.ts"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) createFile(`/${val}`);
                setCreating(null);
              } else if (e.key === 'Escape') setCreating(null);
            }}
            onBlur={() => setCreating(null)}
          />
        </div>
      )}
      {sortEntries(Object.entries(tree))
        .map(([name, node]) => renderNode(name, node, 0, ''))}
    </div>
  );
}
