import { useState } from 'react';
import { clsx } from 'clsx';
import { SNIPPETS, getSnippetsByLanguage, getCategories } from '@/lib/snippets';
import { Search, Code2, X, Plus } from 'lucide-react';

interface SnippetsPanelProps {
  language: string;
  onInsert: (code: string) => void;
  onClose: () => void;
}

export function SnippetsPanel({ language, onInsert, onClose }: SnippetsPanelProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [inserted, setInserted] = useState<string | null>(null);

  const categories = ['all', ...getCategories()];
  const langSnippets = getSnippetsByLanguage(language);
  const allSnippets = activeCategory === 'all'
    ? SNIPPETS
    : SNIPPETS.filter(s => s.category === activeCategory);

  const filtered = (search
    ? (activeCategory === 'all' ? SNIPPETS : allSnippets).filter(s =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      )
    : (activeCategory === 'all' ? SNIPPETS : allSnippets)
  );

  // Prioritize current language snippets
  const sorted = [...filtered].sort((a, b) => {
    const aMatch = a.language === language ? -1 : 0;
    const bMatch = b.language === language ? -1 : 0;
    return aMatch - bMatch;
  });

  const handleInsert = (snippet: typeof SNIPPETS[0]) => {
    onInsert(snippet.code);
    setInserted(snippet.id);
    setTimeout(() => setInserted(null), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-ide-surface border border-ide-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border shrink-0">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-ide-accent" />
            <h2 className="text-sm font-semibold text-ide-text">Code Snippets</h2>
            <span className="text-[10px] text-ide-muted bg-ide-bg px-2 py-0.5 rounded-full">
              {sorted.length} snippets
            </span>
          </div>
          <button onClick={onClose} className="text-ide-muted hover:text-ide-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-ide-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ide-muted" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search snippets..."
              className="w-full bg-ide-bg border border-ide-border rounded-lg pl-9 pr-3 py-2 text-xs text-ide-text outline-none focus:border-ide-accent"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-ide-border overflow-x-auto shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                'px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                activeCategory === cat
                  ? 'bg-ide-accent/20 text-ide-accent'
                  : 'text-ide-muted hover:text-ide-text hover:bg-ide-surface-hover/30'
              )}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Snippets list */}
        <div className="overflow-y-auto p-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sorted.map(snippet => {
              const isCurrentLang = snippet.language === language;
              return (
                <button
                  key={snippet.id}
                  onClick={() => handleInsert(snippet)}
                  className={clsx(
                    'flex flex-col items-start p-3 rounded-lg border transition-all text-left',
                    inserted === snippet.id
                      ? 'border-ide-success bg-ide-success/10'
                      : 'border-ide-border bg-ide-bg hover:border-ide-accent hover:bg-ide-surface-hover/30'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[10px] text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded font-mono">
                      {snippet.language}
                    </span>
                    {isCurrentLang && (
                      <span className="text-[9px] text-ide-accent">● matches current</span>
                    )}
                    {inserted === snippet.id && (
                      <span className="text-[10px] text-ide-success ml-auto">Inserted!</span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-ide-text mt-1.5">{snippet.label}</div>
                  <div className="text-[10px] text-ide-muted mt-0.5">{snippet.description}</div>
                  <div className="text-[10px] text-ide-muted mt-1 font-mono truncate w-full">
                    {snippet.code.split('\n')[0].substring(0, 60)}...
                  </div>
                </button>
              );
            })}
          </div>
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Code2 size={32} className="text-ide-muted opacity-40 mb-2" />
              <p className="text-ide-muted text-sm">No snippets found</p>
              <p className="text-ide-muted text-xs mt-1">Try a different search or category</p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-ide-border shrink-0 flex items-center gap-2 text-[10px] text-ide-muted">
          <Plus size={10} />
          Click a snippet to insert it at your cursor position
        </div>
      </div>
    </div>
  );
}
