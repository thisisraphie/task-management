// ── Data ──────────────────────────────────────────────────────────────────────

const COLS = [
  { id: 'todo',   label: 'To do',       dot: '#94a3b8' },
  { id: 'inprog', label: 'In progress', dot: '#f59e0b' },
  { id: 'review', label: 'In review',   dot: '#818cf8' },
  { id: 'done',   label: 'Done',        dot: '#22c55e' },
];

const ASSIGNEES = [
  { initials: 'AL', color: '#ef4444' },
  { initials: 'BK', color: '#f97316' },
  { initials: 'CM', color: '#eab308' },
  { initials: 'DR', color: '#22c55e' },
  { initials: 'EJ', color: '#06b6d4' },
  { initials: 'FN', color: '#6366f1' },
  { initials: 'GS', color: '#ec4899' },
];

const TAG_LABELS = { feat: 'Feature', bug: 'Bug', design: 'Design', docs: 'Docs', perf: 'Performance' };
const PRIORITY_LABELS = { high: '↑ High', med: '→ Med', low: '↓ Low' };

// ── Tickets ─────────────────────────────────────────────────────────────────────
const DEFAULT_TICKETS = [
  { id: 1, title: 'Set up project boilerplate & CI pipeline', col: 'done',   tag: 'feat',   priority: 'high', assignee: 0, due: '2025-12-01', desc: '' },
  { id: 2, title: 'Design system tokens & color palette', col: 'done',   tag: 'design', priority: 'med',  assignee: 1, due: '2025-12-05', desc: '' },
  { id: 3, title: 'Implement drag-and-drop card movement', col: 'review', tag: 'feat',   priority: 'high', assignee: 2, due: '2026-01-10', desc: '' },
  { id: 4, title: 'Fix memory leak in WebSocket handler', col: 'inprog', tag: 'bug',    priority: 'high', assignee: 0, due: '2026-01-08', desc: '' },
  { id: 5, title: 'Write API documentation for v2 endpoints',col: 'inprog', tag: 'docs',   priority: 'low',  assignee: 3, due: '2026-04-01', desc: '' },
  { id: 6, title: 'Optimize bundle size — lazy load routes', col: 'todo',   tag: 'perf',   priority: 'med',  assignee: 1, due: '2026-05-14', desc: '' },
  { id: 7, title: 'Add keyboard shortcuts for power users', col: 'todo',   tag: 'feat',   priority: 'low',  assignee: 4, due: '2026-04-30', desc: '' },
  { id: 8, title: 'Broken avatar upload on mobile Safari', col: 'review', tag: 'bug',    priority: 'high', assignee: 2, due: '2026-04-18', desc: '' },
];

// ── State ─────────────────────────────────────────────────────────────────────

let tickets = loadTickets();
let nextId  = Math.max(0, ...tickets.map(t => t.id)) + 1;
let dragId  = null;
let editId  = null;   // null = create mode, number = edit mode

// ── Persistence ───────────────────────────────────────────────────────────────

function loadTickets() {
  try {
    const raw = localStorage.getItem('taskflow_tickets');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_TICKETS));
  }
}

function saveTickets() {
  try { localStorage.setItem('taskflow_tickets', JSON.stringify(tickets)); } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function isOverdue(d) { return d && d < today(); }

function getFilters() {
  return {
    q:  document.getElementById('search').value.toLowerCase(),
    tag: document.getElementById('filter-tag').value,
    priority: document.getElementById('filter-priority').value,
  };
}

function applyFilters(list) {
  const { q, tag, priority } = getFilters();
  return list.filter(t =>
    (!q        || t.title.toLowerCase().includes(q)) &&
    (!tag      || t.tag === tag) &&
    (!priority || t.priority === priority)
  );
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderStats() {
  const total  = tickets.length;
  const done   = tickets.filter(t => t.col === 'done').length;
  const inprog = tickets.filter(t => t.col === 'inprog').length;
  const high   = tickets.filter(t => t.priority === 'high' && t.col !== 'done').length;

  document.getElementById('stats-bar').innerHTML = [
    { v: total,  l: 'Total tickets' },
    { v: done,   l: 'Completed' },
    { v: inprog, l: 'In progress' },
    { v: high,   l: 'High priority' },
  ].map(s => `
    <div class="stat">
      <div class="stat-val">${s.v}</div>
      <div class="stat-label">${s.l}</div>
    </div>`).join('');

  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = pct + '% complete';
}

function renderCard(t) {
  const a = ASSIGNEES[t.assignee] || ASSIGNEES[0];
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.id = t.id;
  div.draggable = true;
  div.innerHTML = `
    <div class="card-top">
      <div class="card-title">${escHtml(t.title)}</div>
      <button class="card-edit-btn" title="Edit ticket">⋯</button>
    </div>
    <div class="card-meta">
      <span class="tag tag-${t.tag}">${TAG_LABELS[t.tag]}</span>
      <span class="priority p-${t.priority}">${PRIORITY_LABELS[t.priority]}</span>
    </div>
    <div class="card-footer">
      <div class="assignee" style="background:${a.color}" title="${a.initials}">${a.initials}</div>
      ${t.due ? `<span class="due${isOverdue(t.due) ? ' overdue' : ''}">${t.due}</span>` : ''}
    </div>`;

  div.querySelector('.card-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal(t.id);
  });

  div.addEventListener('dragstart', () => {
    dragId = t.id;
    setTimeout(() => div.classList.add('dragging'), 0);
  });
  div.addEventListener('dragend', () => {
    dragId = null;
    div.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  });

  return div;
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const filtered = applyFilters(tickets);

  COLS.forEach(col => {
    const allInCol      = tickets.filter(t => t.col === col.id);
    const filteredInCol = filtered.filter(t => t.col === col.id);

    const colEl = document.createElement('div');
    colEl.className = 'column';
    colEl.dataset.col = col.id;

    colEl.innerHTML = `
      <div class="col-header">
        <div class="col-title">
          <span class="col-dot" style="background:${col.dot}"></span>
          ${col.label}
          <span class="col-count">${allInCol.length}</span>
        </div>
        <button class="add-col-btn" title="Add ticket to ${col.label}">+</button>
      </div>`;

    colEl.querySelector('.add-col-btn').addEventListener('click', () => openModal(null, col.id));

    filteredInCol.forEach(t => colEl.appendChild(renderCard(t)));

    const placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
    placeholder.textContent = 'Drop here';
    colEl.appendChild(placeholder);

    colEl.addEventListener('dragover', e => {
      e.preventDefault();
      document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
      colEl.classList.add('drag-over');
    });
    colEl.addEventListener('dragleave', e => {
      if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('drag-over');
    });
    colEl.addEventListener('drop', e => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      if (dragId !== null) {
        const t = tickets.find(x => x.id === dragId);
        if (t) { t.col = col.id; saveTickets(); render(); }
      }
    });

    board.appendChild(colEl);
  });
}

function render() {
  renderStats();
  renderBoard();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function populateAssigneeSelect() {
  const sel = document.getElementById('m-assignee');
  sel.innerHTML = ASSIGNEES.map((a, i) => `<option value="${i}">${a.initials}</option>`).join('');
}

function openModal(id = null, defaultCol = 'todo') {
  editId = id;
  const t = id !== null ? tickets.find(x => x.id === id) : null;

  document.getElementById('modal-heading').textContent = t ? 'Edit ticket' : 'Create ticket';
  document.getElementById('save-btn').textContent      = t ? 'Save changes' : 'Create';
  document.getElementById('del-btn').classList.toggle('hidden', !t);

  document.getElementById('m-title').value    = t ? t.title    : '';
  document.getElementById('m-col').value      = t ? t.col      : defaultCol;
  document.getElementById('m-priority').value = t ? t.priority : 'med';
  document.getElementById('m-tag').value      = t ? t.tag      : 'feat';
  document.getElementById('m-assignee').value = t ? t.assignee : 0;
  document.getElementById('m-due').value      = t ? t.due      : '';
  document.getElementById('m-desc').value     = t ? t.desc     : '';

  document.getElementById('modal-backdrop').classList.remove('hidden');
  setTimeout(() => document.getElementById('m-title').focus(), 50);
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  editId = null;
}

function saveModal() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) { document.getElementById('m-title').focus(); return; }

  const data = {
    title,
    col:      document.getElementById('m-col').value,
    priority: document.getElementById('m-priority').value,
    tag:      document.getElementById('m-tag').value,
    assignee: Number(document.getElementById('m-assignee').value),
    due:      document.getElementById('m-due').value,
    desc:     document.getElementById('m-desc').value,
  };

  if (editId !== null) {
    Object.assign(tickets.find(x => x.id === editId), data);
  } else {
    tickets.push({ id: nextId++, ...data });
  }

  saveTickets();
  closeModal();
  currentView === 'calendar' ? renderCalendar() : render();
}

function deleteTicket() {
  if (editId === null) return;
  tickets = tickets.filter(x => x.id !== editId);
  saveTickets();
  closeModal();
  currentView === 'calendar' ? renderCalendar() : render();
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    openModal();
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── View switching ────────────────────────────────────────────────────────────

let currentView = 'board';

function switchView(view) {
  currentView = view;
  document.getElementById('view-board').classList.toggle('hidden', view !== 'board');
  document.getElementById('view-calendar').classList.toggle('hidden', view !== 'calendar');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'calendar') renderCalendar();
  else render();
}

// ── Calendar ──────────────────────────────────────────────────────────────────

let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-based

function renderCalendar() {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('cal-month-label').textContent = `${MONTHS[calMonth]} ${calYear}`;

  const todayStr = today();
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Group tickets by due date
  const byDate = {};
  tickets.forEach(t => { if (t.due) { (byDate[t.due] = byDate[t.due] || []).push(t); } });

  for (let i = 0; i < totalCells; i++) {
    let day, dateStr, isOther = false;
    if (i < firstDay) {
      day = daysInPrev - firstDay + i + 1;
      const m = String(calMonth).padStart(2, '0');
      const y = calMonth === 0 ? calYear - 1 : calYear;
      const mm = calMonth === 0 ? '12' : m;
      dateStr = `${y}-${mm}-${String(day).padStart(2, '0')}`;
      isOther = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      const m = calMonth + 2;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      const mm = String(calMonth === 11 ? 1 : m).padStart(2, '0');
      dateStr = `${y}-${mm}-${String(day).padStart(2, '0')}`;
      isOther = true;
    } else {
      day = i - firstDay + 1;
      dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (isOther ? ' other-month' : '') + (dateStr === todayStr ? ' is-today' : '');

    const dateEl = document.createElement('div');
    dateEl.className = 'cal-date';
    dateEl.textContent = day;
    cell.appendChild(dateEl);

    const dayTickets = byDate[dateStr] || [];
    const MAX_SHOW = 3;
    dayTickets.slice(0, MAX_SHOW).forEach(t => {
      const chip = document.createElement('div');
      chip.className = `cal-chip p-${t.priority}${t.col === 'done' ? ' col-done' : ''}`;
      chip.title = t.title;
      chip.textContent = t.title;
      chip.addEventListener('click', () => openModal(t.id));
      cell.appendChild(chip);
    });
    if (dayTickets.length > MAX_SHOW) {
      const more = document.createElement('div');
      more.className = 'cal-more';
      more.textContent = `+${dayTickets.length - MAX_SHOW} more`;
      more.addEventListener('click', () => {
        dayTickets.forEach(t => openModal(t.id));
      });
      cell.appendChild(more);
    }

    grid.appendChild(cell);
  }

  // Tickets with no due date
  const noDue = tickets.filter(t => !t.due);
  const banner = document.querySelector('.no-due-banner') || (() => {
    const b = document.createElement('div');
    b.className = 'no-due-banner';
    document.getElementById('view-calendar').appendChild(b);
    return b;
  })();
  if (noDue.length) {
    banner.innerHTML = `<span class="no-due-label">No due date:</span>` +
      noDue.map(t => `<div class="cal-chip p-${t.priority}" style="cursor:pointer" data-id="${t.id}">${escHtml(t.title)}</div>`).join('');
    banner.querySelectorAll('.cal-chip').forEach(chip => {
      chip.addEventListener('click', () => openModal(Number(chip.dataset.id)));
    });
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ── Editable project name ─────────────────────────────────────────────────────
const projectNameEl = document.getElementById('project-name');
if (projectNameEl) {
  projectNameEl.addEventListener('dblclick', function() {
    const currentName = this.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'project-name-input';
    input.style.cssText = `
      font-size: 13px;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid var(--accent);
      background: white;
      font-family: inherit;
      outline: none;
    `;
    
    this.replaceWith(input);
    input.focus();
    
    const saveName = () => {
      const newName = input.value.trim() || 'TaskFlow';
      projectNameEl.textContent = newName;
      input.replaceWith(projectNameEl);
      localStorage.setItem('project_name', newName);
    };
    
    input.addEventListener('blur', saveName);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveName();
    });
  });
}

// Load saved project name on startup ─────────────────────────────────────────────────────────────────
const savedName = localStorage.getItem('project_name');
if (savedName && projectNameEl) {
  projectNameEl.textContent = savedName;
}



// ── Bootstrap ─────────────────────────────────────────────────────────────────

populateAssigneeSelect();

document.getElementById('search').addEventListener('input', () => { if (currentView === 'board') render(); else renderCalendar(); });
document.getElementById('filter-tag').addEventListener('change', () => { if (currentView === 'board') render(); else renderCalendar(); });
document.getElementById('filter-priority').addEventListener('change', () => { if (currentView === 'board') render(); else renderCalendar(); });
document.getElementById('new-ticket-btn').addEventListener('click', () => openModal());
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('save-btn').addEventListener('click', saveModal);
document.getElementById('del-btn').addEventListener('click', deleteTicket);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchView(tab.dataset.view));
});

document.getElementById('cal-prev').addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar();
});
document.getElementById('cal-next').addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar();
});
document.getElementById('cal-today').addEventListener('click', () => {
  calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); renderCalendar();
});

render();