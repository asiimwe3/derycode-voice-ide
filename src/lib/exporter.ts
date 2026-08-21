/**
 * Export & Build utilities — download code as files, build standalone HTML apps,
 * download project as ZIP, and generate shareable URLs.
 */

import { fileSystem } from './fileSystem';

// File extension mapping
const EXT_MAP: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  python: 'py',
  html: 'html',
  css: 'css',
  json: 'json',
  plaintext: 'txt',
};

/** Download a single file to the user's device */
export function downloadFile(filename: string, content: string, mime: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Download current code with the correct file extension */
export function downloadCode(code: string, language: string) {
  const ext = EXT_MAP[language] || 'txt';
  const filename = `derycode-${Date.now()}.${ext}`;
  const mime = language === 'html' ? 'text/html' : 'application/javascript';
  downloadFile(filename, code, mime);
}

/**
 * Build a standalone HTML app — inlines CSS and JS into a single HTML file
 * that can be opened in any browser.
 */
export function buildHtmlApp(code: string, language: string): string {
  if (language === 'html') return code;

  if (language === 'css') {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n  <style>\n' + code + '\n  </style>\n</head>\n<body>\n  <div style="padding: 24px; font-family: system-ui, sans-serif;">\n    <h1>My App</h1>\n    <p>Edit the CSS above to style this page.</p>\n    <button>Click Me</button>\n    <input type="text" placeholder="Type here">\n    <ul><li>Item One</li><li>Item Two</li><li>Item Three</li></ul>\n  </div>\n</body>\n</html>';
  }

  if (language === 'javascript' || language === 'jsx') {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My App</title>\n  <style>\n    body { font-family: system-ui, sans-serif; padding: 24px; margin: 0; }\n    #app { min-height: 100vh; }\n  </style>\n</head>\n<body>\n  <div id="app"></div>\n  <script>\n    const consoleDiv = document.createElement("div");\n    consoleDiv.style.cssText = "position:fixed;bottom:0;left:0;right:0;max-height:200px;overflow-y:auto;background:#1a1a2e;color:#e0e0f0;font-family:monospace;font-size:12px;padding:12px;border-top:1px solid #333";\n    document.body.appendChild(consoleDiv);\n    const origLog = console.log;\n    console.log = function() { origLog.apply(console, arguments); var l = document.createElement("div"); l.textContent = Array.from(arguments).map(function(a) { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); }).join(" "); consoleDiv.appendChild(l); };\n    console.error = function() { var l = document.createElement("div"); l.style.color = "#e74c3c"; l.textContent = Array.from(arguments).map(String).join(" "); consoleDiv.appendChild(l); };\n  </script>\n  <script>\n    try {\n' + code + '\n    } catch (e) { console.error(e.message); }\n  </script>\n</body>\n</html>';
  }

  return '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>My App</title></head>\n<body>\n  <pre style="padding:24px;font-family:monospace;white-space:pre-wrap;">' + code.replace(/</g, '&lt;') + '</pre>\n</body></html>';
}

/** Build and download a standalone HTML app */
export function buildAndDownloadApp(code: string, language: string) {
  const html = buildHtmlApp(code, language);
  const filename = `app-${Date.now()}.html`;
  downloadFile(filename, html, 'text/html');
}

/** Download all project files as a ZIP */
export async function downloadProjectZip() {
  if (typeof (window as any).JSZip === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load ZIP library'));
      document.head.appendChild(script);
    });
  }

  const JSZip = (window as any).JSZip;
  const zip = new JSZip();
  const files = await fileSystem.getAll();

  for (const file of files) {
    if (file.type === 'file' && file.content) {
      const path = file.path.replace(/^\//, '');
      zip.file(path, file.content);
    }
  }

  const fileList = files.filter(f => f.type === 'file').map(f => '- ' + f.path).join('\n');
  zip.file('README.md', '# Derycode Voice IDE Project\n\nBuilt with Derycode Voice IDE.\n\n## Files\n\n' + fileList + '\n');

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `derycode-project-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Generate a shareable URL with encoded code */
export function generateShareUrl(code: string, language: string): string {
  const data = { code, language, t: Date.now() };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#share=${encoded}`;
}

/** Parse share data from URL hash */
export function parseShareUrl(): { code: string; language: string } | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  try {
    const encoded = hash.slice(7);
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    return { code: data.code, language: data.language };
  } catch {
    return null;
  }
}

interface TemplateFile {
  path: string;
  content: string;
}

interface ProjectTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  files: TemplateFile[];
}

/** Project templates */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    label: 'Empty Project',
    description: 'Start from scratch',
    icon: '📄',
    files: [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head><title>My App</title></head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>\n' },
    ],
  },
  {
    id: 'landing',
    label: 'Landing Page',
    description: 'HTML + CSS marketing page',
    icon: '🎨',
    files: [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Landing Page</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <header>\n    <nav>\n      <div class="logo">MyApp</div>\n      <div class="nav-links">\n        <a href="#features">Features</a>\n        <a href="#about">About</a>\n        <a href="#contact" class="cta">Get Started</a>\n      </div>\n    </nav>\n  </header>\n  <section class="hero">\n    <h1>Build Something Amazing</h1>\n    <p>A beautiful landing page built with Derycode Voice IDE.</p>\n    <button onclick="alert(\'Welcome!\')">Get Started</button>\n  </section>\n  <section id="features" class="features">\n    <div class="feature-card"><h3>Fast</h3><p>Lightning quick performance</p></div>\n    <div class="feature-card"><h3>Secure</h3><p>Your data is protected</p></div>\n    <div class="feature-card"><h3>Beautiful</h3><p>Stunning out of the box</p></div>\n  </section>\n  <script src="app.js"></script>\n</body>\n</html>\n' },
      { path: '/style.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; color: #1a1a2e; }\nheader { padding: 20px 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\nnav { display: flex; justify-content: space-between; align-items: center; }\n.logo { font-weight: bold; font-size: 24px; color: #7c83ff; }\n.nav-links { display: flex; gap: 24px; align-items: center; }\n.nav-links a { text-decoration: none; color: #333; font-weight: 500; }\n.nav-links .cta { background: #7c83ff; color: white; padding: 8px 20px; border-radius: 8px; }\n.hero { text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }\n.hero h1 { font-size: 48px; margin-bottom: 16px; }\n.hero p { font-size: 20px; opacity: 0.9; margin-bottom: 32px; }\n.hero button { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 14px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; }\n.features { display: flex; gap: 24px; padding: 60px 40px; max-width: 900px; margin: 0 auto; }\n.feature-card { flex: 1; text-align: center; padding: 32px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }\n.feature-card h3 { color: #7c83ff; margin-bottom: 8px; }\n@media (max-width: 768px) {\n  .features { flex-direction: column; }\n  .hero h1 { font-size: 32px; }\n}\n' },
      { path: '/app.js', content: 'console.log("Landing page loaded!");\n\n// Smooth scroll for nav links\ndocument.querySelectorAll(\'a[href^="#"]\').forEach(link => {\n  link.addEventListener(\'click\', (e) => {\n    e.preventDefault();\n    const target = document.querySelector(link.getAttribute(\'href\'));\n    if (target) target.scrollIntoView({ behavior: \'smooth\' });\n  });\n});\n' },
    ],
  },
  {
    id: 'calculator',
    label: 'Calculator App',
    description: 'Interactive JS calculator',
    icon: '🧮',
    files: [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Calculator</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="calculator">\n    <div class="display" id="display">0</div>\n    <div class="buttons">\n      <button class="btn clear" onclick="clearAll()">C</button>\n      <button class="btn op" onclick="setOp(\'/\')">÷</button>\n      <button class="btn op" onclick="setOp(\'*\')">×</button>\n      <button class="btn op" onclick="backspace()">⌫</button>\n      <button class="btn" onclick="inputNum(\'7\')">7</button>\n      <button class="btn" onclick="inputNum(\'8\')">8</button>\n      <button class="btn" onclick="inputNum(\'9\')">9</button>\n      <button class="btn op" onclick="setOp(\'-\')">−</button>\n      <button class="btn" onclick="inputNum(\'4\')">4</button>\n      <button class="btn" onclick="inputNum(\'5\')">5</button>\n      <button class="btn" onclick="inputNum(\'6\')">6</button>\n      <button class="btn op" onclick="setOp(\'+\')">+</button>\n      <button class="btn" onclick="inputNum(\'1\')">1</button>\n      <button class="btn" onclick="inputNum(\'2\')">2</button>\n      <button class="btn" onclick="inputNum(\'3\')">3</button>\n      <button class="btn equals" onclick="calculate()">=</button>\n      <button class="btn zero" onclick="inputNum(\'0\')">0</button>\n      <button class="btn" onclick="inputNum(\'.\')">.</button>\n    </div>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>\n' },
      { path: '/style.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody {\n  display: flex; justify-content: center; align-items: center;\n  min-height: 100vh; background: #1a1a2e;\n  font-family: system-ui, sans-serif;\n}\n.calculator {\n  background: #16213e; border-radius: 20px; padding: 20px;\n  box-shadow: 0 20px 60px rgba(0,0,0,0.5); width: 300px;\n}\n.display {\n  background: #0f0f1e; color: #fff; font-size: 40px; text-align: right;\n  padding: 20px; border-radius: 12px; margin-bottom: 16px; min-height: 80px;\n  display: flex; align-items: center; justify-content: flex-end;\n}\n.buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }\n.btn {\n  border: none; padding: 18px; font-size: 20px; border-radius: 12px;\n  cursor: pointer; background: #1a1a3e; color: #fff; transition: all 0.15s;\n}\n.btn:hover { transform: scale(1.05); }\n.btn:active { transform: scale(0.95); }\n.btn.op { background: #7c83ff; }\n.btn.clear { background: #e74c3c; }\n.btn.equals { background: #2ecc71; grid-row: span 2; }\n.btn.zero { grid-column: span 2; }\n' },
      { path: '/app.js', content: "let current = '0';\nlet previous = null;\nlet operation = null;\n\nconst display = document.getElementById('display');\n\nfunction updateDisplay() {\n  display.textContent = current;\n}\n\nfunction inputNum(num) {\n  if (current === '0' && num !== '.') current = '';\n  if (num === '.' && current.includes('.')) return;\n  current += num;\n  updateDisplay();\n}\n\nfunction setOp(op) {\n  if (operation) calculate();\n  previous = parseFloat(current);\n  operation = op;\n  current = '0';\n}\n\nfunction calculate() {\n  if (!operation || previous === null) return;\n  const curr = parseFloat(current);\n  let result;\n  switch(operation) {\n    case '+': result = previous + curr; break;\n    case '-': result = previous - curr; break;\n    case '*': result = previous * curr; break;\n    case '/': result = previous / curr; break;\n  }\n  current = String(Math.round(result * 100000) / 100000);\n  operation = null;\n  previous = null;\n  updateDisplay();\n}\n\nfunction clearAll() { current = '0'; previous = null; operation = null; updateDisplay(); }\nfunction backspace() { current = current.length > 1 ? current.slice(0, -1) : '0'; updateDisplay(); }\n" },
    ],
  },
  {
    id: 'todo',
    label: 'Todo App',
    description: 'Task manager with localStorage',
    icon: '✅',
    files: [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Todo App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="app">\n    <h1>My Tasks</h1>\n    <form id="form">\n      <input type="text" id="input" placeholder="Add a task..." required>\n      <button type="submit">Add</button>\n    </form>\n    <ul id="list"></ul>\n    <p id="count">0 tasks</p>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>\n' },
      { path: '/style.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; background: #f0f0f5; padding: 20px; }\n.app { max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }\nh1 { color: #333; margin-bottom: 20px; }\nform { display: flex; gap: 8px; margin-bottom: 20px; }\ninput { flex: 1; padding: 12px 16px; border: 2px solid #ddd; border-radius: 8px; font-size: 15px; outline: none; }\ninput:focus { border-color: #7c83ff; }\nbutton { background: #7c83ff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 15px; }\nbutton:hover { background: #6a72e0; }\nul { list-style: none; }\nli { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #eee; }\nli.done span { text-decoration: line-through; color: #aaa; }\nli input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }\nli span { flex: 1; font-size: 15px; }\nli button { background: transparent; color: #e74c3c; padding: 4px 8px; font-size: 13px; }\n#count { color: #888; font-size: 13px; margin-top: 16px; }\n' },
      { path: '/app.js', content: "let todos = JSON.parse(localStorage.getItem('todos') || '[]');\nconst list = document.getElementById('list');\nconst input = document.getElementById('input');\nconst form = document.getElementById('form');\nconst count = document.getElementById('count');\n\nfunction save() { localStorage.setItem('todos', JSON.stringify(todos)); }\n\nfunction render() {\n  list.innerHTML = '';\n  todos.forEach((todo, i) => {\n    const li = document.createElement('li');\n    if (todo.done) li.className = 'done';\n    li.innerHTML = '<input type=\"checkbox\" ' + (todo.done ? 'checked' : '') + ' onchange=\"toggle(' + i + ')\"><span>' + todo.text + '</span><button onclick=\"remove(' + i + ')\">Delete</button>';\n    list.appendChild(li);\n  });\n  count.textContent = todos.length + ' task' + (todos.length !== 1 ? 's' : '');\n}\n\nfunction toggle(i) { todos[i].done = !todos[i].done; save(); render(); }\nfunction remove(i) { todos.splice(i, 1); save(); render(); }\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  todos.push({ text: input.value, done: false });\n  input.value = '';\n  save();\n  render();\n});\n\nrender();\n" },
    ],
  },
  {
    id: 'game',
    label: 'Click Game',
    description: 'Simple browser game',
    icon: '🎮',
    files: [
      { path: '/index.html', content: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Click Game</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="game">\n    <h1>Click the Dot!</h1>\n    <p>Score: <span id="score">0</span> | Time: <span id="time">30</span>s</p>\n    <div id="arena"></div>\n    <button id="start" onclick="startGame()">Start Game</button>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>\n' },
      { path: '/style.css', content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: system-ui, sans-serif; background: #0f0f1e; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; }\n.game { text-align: center; }\nh1 { margin-bottom: 10px; }\np { font-size: 20px; margin-bottom: 20px; }\n#arena { width: 300px; height: 300px; background: #16213e; border-radius: 16px; position: relative; margin: 0 auto 20px; overflow: hidden; }\n.dot { width: 40px; height: 40px; background: #7c83ff; border-radius: 50%; position: absolute; cursor: pointer; transition: transform 0.1s; }\n.dot:hover { transform: scale(1.2); }\n#start { background: #2ecc71; color: white; border: none; padding: 14px 40px; border-radius: 10px; font-size: 18px; cursor: pointer; }\n#start:hover { background: #27ae60; }\n' },
      { path: '/app.js', content: "let score = 0;\nlet timeLeft = 30;\nlet gameTimer = null;\nlet dotTimer = null;\nconst arena = document.getElementById('arena');\nconst scoreEl = document.getElementById('score');\nconst timeEl = document.getElementById('time');\nconst startBtn = document.getElementById('start');\n\nfunction spawnDot() {\n  arena.innerHTML = '';\n  const dot = document.createElement('div');\n  dot.className = 'dot';\n  dot.style.left = Math.random() * 260 + 'px';\n  dot.style.top = Math.random() * 260 + 'px';\n  dot.onclick = function() { score++; scoreEl.textContent = score; dot.remove(); };\n  arena.appendChild(dot);\n}\n\nfunction startGame() {\n  score = 0;\n  timeLeft = 30;\n  scoreEl.textContent = 0;\n  timeEl.textContent = 30;\n  startBtn.style.display = 'none';\n  arena.innerHTML = '';\n\n  dotTimer = setInterval(spawnDot, 800);\n  gameTimer = setInterval(function() {\n    timeLeft--;\n    timeEl.textContent = timeLeft;\n    if (timeLeft <= 0) endGame();\n  }, 1000);\n  spawnDot();\n}\n\nfunction endGame() {\n  clearInterval(gameTimer);\n  clearInterval(dotTimer);\n  arena.innerHTML = '<div style=\"display:flex;align-items:center;justify-content:center;height:100%;font-size:18px;\">Game Over! Score: ' + score + '</div>';\n  startBtn.textContent = 'Play Again';\n  startBtn.style.display = 'inline-block';\n}\n" },
    ],
  },
];
