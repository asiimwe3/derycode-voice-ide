/**
 * Code Runner — In-browser compiler and execution engine
 * Supports: JavaScript, TypeScript, Python (Pyodide), HTML/CSS (preview), JSON (parse)
 */

export interface RunResult {
  output: string[];
  errors: string[];
  htmlPreview?: string;
  duration: number;
}

type OutputHandler = (text: string) => void;
type ErrorHandler = (text: string) => void;
type StatusHandler = (status: string) => void;

// --- JavaScript ---
async function runJavaScript(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler
): Promise<void> {
  const captureConsole = (method: string) => {
    return (...args: any[]) => {
      const text = args.map(a => {
        if (a === null) return 'null';
        if (a === undefined) return 'undefined';
        if (typeof a === 'object') {
          try { return JSON.stringify(a, null, 2); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');
      onOutput(text);
    };
  };

  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  console.log = captureConsole('log');
  console.error = captureConsole('error');
  console.warn = captureConsole('warn');
  console.info = captureConsole('info');

  try {
    // Use AsyncFunction for top-level await support
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(code);
    await fn();
  } catch (e: any) {
    onError(e?.message || String(e));
    if (e?.stack) {
      const stackLines = e.stack.split('\n').slice(1, 4).join('\n');
      onError(stackLines);
    }
  } finally {
    console.log = orig.log;
    console.error = orig.error;
    console.warn = orig.warn;
    console.info = orig.info;
  }
}

// --- TypeScript ---
declare global {
  interface Window { ts?: any; pyodide?: any; loadPyodide?: any; }
}

async function loadTypeScript(): Promise<void> {
  if (window.ts) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/typescript@5.4.5/lib/typescript.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TypeScript compiler'));
    document.head.appendChild(script);
  });
}

async function runTypeScript(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler,
  onStatus: StatusHandler
): Promise<void> {
  onStatus('Compiling TypeScript…');
  try {
    await loadTypeScript();
    const jsCode = window.ts.transpileModule(code, {
      compilerOptions: {
        target: window.ts.ScriptTarget.ES2020,
        module: window.ts.ModuleKind.None,
        strict: false,
        removeComments: true,
      },
      reportDiagnostics: true,
    });

    if (jsCode.diagnostics && jsCode.diagnostics.length > 0) {
      const errors = jsCode.diagnostics
        .filter((d: any) => d.category === 1) // Error category
        .map((d: any) => window.ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      if (errors.length > 0) {
        errors.forEach((e: string) => onError(e));
        return;
      }
    }

    onStatus('Running compiled JavaScript…');
    await runJavaScript(jsCode.outputText, onOutput, onError);
  } catch (e: any) {
    onError(e?.message || String(e));
  }
}

// --- Python (Pyodide) ---
async function loadPyodide(onStatus: StatusHandler): Promise<void> {
  if (window.pyodide) return;
  onStatus('Loading Python runtime (Pyodide)… this may take a moment.');
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
    script.onload = async () => {
      try {
        window.pyodide = await window.loadPyodide();
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Python runtime'));
    document.head.appendChild(script);
  });
}

async function runPython(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler,
  onStatus: StatusHandler
): Promise<void> {
  try {
    await loadPyodide(onStatus);
    onStatus('Running Python…');

    window.pyodide.setStdout({ batched: (s: string) => onOutput(s) });
    window.pyodide.setStderr({ batched: (s: string) => onError(s) });

    await window.pyodide.runPythonAsync(code);
  } catch (e: any) {
    onError(e?.message || String(e));
  }
}

// --- HTML / CSS Preview ---
function runHTML(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler
): string {
  try {
    // Return the HTML for iframe rendering
    onOutput('HTML preview rendered below.');
    return code;
  } catch (e: any) {
    onError(e?.message || String(e));
    return '';
  }
}

function runCSS(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler
): string {
  // Wrap CSS in an HTML template for preview
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
${code}
</style>
</head>
<body>
  <div class="preview-container" style="padding: 24px; font-family: system-ui, sans-serif;">
    <h1>CSS Preview</h1>
    <p>This is a paragraph with the applied styles.</p>
    <button>Sample Button</button>
    <ul>
      <li>Item One</li>
      <li>Item Two</li>
      <li>Item Three</li>
    </ul>
    <input type="text" placeholder="Sample input" />
    <div style="margin-top: 16px; padding: 16px; border: 1px solid #ccc;">
      <p>Box with padding and border</p>
    </div>
  </div>
</body>
</html>`;
  onOutput('CSS preview rendered below.');
  return html;
}

// --- JSON ---
function runJSON(
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler
): void {
  try {
    const parsed = JSON.parse(code);
    onOutput(JSON.stringify(parsed, null, 2));
    onOutput(`\n✓ Valid JSON (${Object.keys(parsed).length || Array.isArray(parsed) ? parsed.length || Object.keys(parsed).length : 0} entries)`);
  } catch (e: any) {
    onError(`Invalid JSON: ${e?.message || String(e)}`);
  }
}

// --- Main runner ---
export async function runCode(
  language: string,
  code: string,
  onOutput: OutputHandler,
  onError: ErrorHandler,
  onStatus: StatusHandler
): Promise<{ htmlPreview?: string }> {
  const start = Date.now();
  let htmlPreview: string | undefined;

  switch (language) {
    case 'javascript':
    case 'jsx':
      onStatus('Running JavaScript…');
      await runJavaScript(code, onOutput, onError);
      break;

    case 'typescript':
    case 'tsx':
      await runTypeScript(code, onOutput, onError, onStatus);
      break;

    case 'python':
      await runPython(code, onOutput, onError, onStatus);
      break;

    case 'html':
      htmlPreview = runHTML(code, onOutput, onError);
      break;

    case 'css':
      htmlPreview = runCSS(code, onOutput, onError);
      break;

    case 'json':
      onStatus('Parsing JSON…');
      runJSON(code, onOutput, onError);
      break;

    default:
      onError(`In-browser execution is not available for "${language}". Supported languages: JavaScript, TypeScript, Python, HTML, CSS, and JSON.`);
      break;
  }

  const duration = Date.now() - start;
  onStatus(`Completed in ${duration}ms`);

  return { htmlPreview };
}

export const supportedLanguages = [
  { id: 'javascript', label: 'JavaScript', ext: 'js', note: 'Runs natively in your browser' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', note: 'Compiled to JavaScript, then runs in browser' },
  { id: 'tsx', label: 'TypeScript (React)', ext: 'tsx', note: 'JSX compiled, then runs in browser' },
  { id: 'jsx', label: 'JavaScript (React)', ext: 'jsx', note: 'JSX transformed, then runs in browser' },
  { id: 'python', label: 'Python', ext: 'py', note: 'Runs via Pyodide (Python in WebAssembly)' },
  { id: 'html', label: 'HTML', ext: 'html', note: 'Renders a live preview' },
  { id: 'css', label: 'CSS', ext: 'css', note: 'Renders a live preview with sample content' },
  { id: 'json', label: 'JSON', ext: 'json', note: 'Validates and formats' },
];
