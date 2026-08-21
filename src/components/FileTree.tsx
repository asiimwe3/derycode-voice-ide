import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';

export function FileTree() {
  const files = useIDEStore((s) => s.files);
  const activeTab = useIDEStore((s) => s.activeTab);
  const openFile = useIDEStore((s) => s.openFile);

  const renderNode = (node: any, depth: number = 0) => {
    const isActive = activeTab === node.path;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className="px-2 py-1 text-xs font-medium text-ide-muted select-none"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            📁 {node.name}
          </div>
          {node.children?.map((child: any) => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        className={clsx(
          'px-2 py-1 text-xs cursor-pointer select-none hover:bg-ide-surface transition-colors',
          isActive ? 'bg-ide-surface text-ide-accent' : 'text-ide-text'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => openFile(node.path)}
      >
        📄 {node.name}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto py-2">
      {files.map((node) => renderNode(node))}
    </div>
  );
}
