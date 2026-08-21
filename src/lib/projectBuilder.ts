/**
 * Project Builder — combines multiple files from the file tree into a single
 * HTML document for live preview. Resolves <link> and <script src> tags
 * to inline the content of linked CSS and JS files.
 */

import { fileSystem } from './fileSystem';

/** Get all file contents indexed by path */
async function getFileMap(): Promise<Map<string, string>> {
  const all = await fileSystem.getAll();
  const map = new Map<string, string>();
  for (const f of all) {
    if (f.type === 'file' && f.content !== undefined) {
      map.set(f.path, f.content);
      map.set('/' + f.name, f.content);
    }
  }
  return map;
}

/** Resolve a relative path from a base path */
function resolvePath(base: string, rel: string): string {
  if (rel.startsWith('/')) return rel;
  if (rel.startsWith('./')) rel = rel.slice(2);
  const baseDir = base.substring(0, base.lastIndexOf('/'));
  const parts = baseDir.split('/').filter(Boolean);
  for (const part of rel.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return '/' + parts.join('/');
}

/** Console capture script injected into previews */
const CONSOLE_CAPTURE = [
  '(function(){',
  'var o=console.log,w=console.warn,e=console.error;',
  'function s(t,a){var tx=Array.from(a).map(function(x){',
  'if(typeof x==="object"){try{return JSON.stringify(x,null,2)}catch(e){return String(x)}}',
  'return String(x)}).join(" ");',
  'window.parent.postMessage({source:"live-preview",type:t,text:tx},"*")}',
  'console.log=function(){s("log",arguments);o.apply(console,arguments)};',
  'console.warn=function(){s("warn",arguments);w.apply(console,arguments)};',
  'console.error=function(){s("error",arguments);e.apply(console,arguments)};',
  'window.onerror=function(m,s,l,c,err){s("error",[err?err.message:m])};',
  '})();',
].join('\n');

/**
 * Build a complete HTML document from the file tree.
 * If currentFile is HTML, inlines linked CSS and JS.
 * If currentFile is CSS or JS, wraps it in an HTML template.
 */
export async function buildProjectPreview(
  currentCode: string,
  language: string,
  currentPath?: string
): Promise<string> {
  const fileMap = await getFileMap();

  if (language === 'html') {
    return inlineLinkedFiles(currentCode, fileMap, currentPath);
  }

  if (language === 'css') {
    const htmlFiles = Array.from(fileMap.keys()).filter(k => k.endsWith('.html'));
    for (const htmlPath of htmlFiles) {
      const html = fileMap.get(htmlPath) || '';
      const cssName = currentPath?.split('/').pop() || '';
      if (html.includes(cssName)) {
        const updated = html.replace(
          /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,
          '<style>\n' + currentCode + '\n</style>'
        );
        return inlineLinkedFiles(updated, fileMap, htmlPath);
      }
    }
    return buildStandaloneCSS(currentCode);
  }

  if (language === 'javascript' || language === 'jsx') {
    const jsName = currentPath?.split('/').pop() || 'app.js';
    const htmlFiles = Array.from(fileMap.keys()).filter(k => k.endsWith('.html'));
    for (const htmlPath of htmlFiles) {
      const html = fileMap.get(htmlPath) || '';
      if (html.includes(jsName)) {
        const scriptTagPattern = /<script[^>]*src=["'"][^"'"]*["'"][^>]*<\/script>/gi;
        const updated = html.replace(scriptTagPattern, "<script>\n" + currentCode + "\n</script>");
        return inlineLinkedFiles(updated, fileMap, htmlPath);
      }
    }
    return buildStandaloneJS(currentCode);
  }

  return '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"></head>\n<body>\n<pre style="padding:24px;font-family:monospace;white-space:pre-wrap;">' +
    currentCode.replace(/</g, '&lt;') + '</pre>\n</body></html>';
}

/** Inline all linked CSS and JS files into an HTML document */
function inlineLinkedFiles(html: string, fileMap: Map<string, string>, basePath?: string): string {
  let result = html;

  // Inline <link rel="stylesheet" href="...">
  result = result.replace(
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const resolvedPath = basePath ? resolvePath(basePath, href) : href;
      const content = fileMap.get(resolvedPath) || fileMap.get(href) || fileMap.get('/' + href);
      if (content) return '<style>\n' + content + '\n</style>';
      return match;
    }
  );

  // Inline <script src="...">
  result = result.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, src) => {
      const resolvedPath = basePath ? resolvePath(basePath, src) : src;
      const content = fileMap.get(resolvedPath) || fileMap.get(src) || fileMap.get('/' + src);
      if (content) return '<script>\n' + content + '\n</script>';
      return match;
    }
  );

  // Inject console capture
  const scriptTag = '<script>\n' + CONSOLE_CAPTURE + '\n<\/script>';
  if (result.includes('</body>')) {
    result = result.replace('</body>', scriptTag + '\n</body>');
  } else {
    result += scriptTag;
  }

  return result;
}

function buildStandaloneCSS(css: string): string {
  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>',
    css,
    '</style></head><body>',
    '<div style="padding:24px;font-family:system-ui,sans-serif">',
    '<h1>CSS Preview</h1><p>Styled paragraph.</p>',
    '<button>Button</button><input type="text" placeholder="Input">',
    '<ul><li>Item 1</li><li>Item 2</li></ul>',
    '</div></body></html>',
  ].join('\n');
}

function buildStandaloneJS(code: string): string {
  const parts = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8"></head>',
    '<body><div id="app" style="padding:24px;font-family:system-ui,sans-serif;"></div>',
    '<script>',
    CONSOLE_CAPTURE,
    '<\/script>',
    '<script>',
    'try {',
    code,
    '} catch(e) { console.error(e.message); }',
    '<\/script>',
    '</body></html>',
  ];
  return parts.join('\n');
}
