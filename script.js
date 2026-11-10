

const STORAGE_KEY = 'deadline_ninja_tasks_simple';
let tasks = [];

// Get references to HTML elements so we can control them with JavaScript
const tasksListContainer = document.getElementById('tasksListContainer');
const emptyStateContainer = document.getElementById('emptyStateContainer');
const taskForm = document.getElementById('taskForm');
const taskModalBackdrop = document.getElementById('taskModalBackdrop');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// Run this function as soon as the page loads
document.addEventListener('DOMContentLoaded', function() {
  displayCurrentDate();
  loadTasks();
  setupEventListeners();
  renderTasks();
});

// 1. Show today's date at the top bar
function displayCurrentDate() {
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  const today = new Date().toLocaleDateString('en-US', options);
  currentDateDisplay.textContent = today;
}

// 2. Load tasks from browser storage (LocalStorage)
function loadTasks() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      tasks = JSON.parse(savedData);
    } catch (error) {
      tasks = getSampleTasks(); // fallback if data is broken
    }
  } else {
    tasks = getSampleTasks(); // load default demo tasks if empty
  }
}

// Save current tasks array into browser storage
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Default demo tasks
function getSampleTasks() {
  return [
    {
      id: 'task_1',
      title: 'Data Structures Lab Assignment',
      subject: 'Computer Science',
      dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      priority: 'high',
      completed: false,
      desc: 'Implement binary search tree rotations in C++.'
    },
    {
      id: 'task_2',
      title: 'Calculus II Problem Set',
      subject: 'Mathematics',
      dueDate: new Date(Date.now() + 259200000).toISOString().slice(0, 16),
      priority: 'medium',
      completed: false,
      desc: 'Exercises on multivariable integrals.'
    }
  ];
}

// 3. Main render function: filters, sorts, and displays tasks on the page
function renderTasks() {
  // Clear the list container first so we don't duplicate items
  tasksListContainer.innerHTML = '';

  // Get values from filters and search bar
  const currentFilter = document.querySelector('.pill-btn.active').getAttribute('data-filter');
  const currentSubject = document.getElementById('subjectFilter').value;
  const currentSort = document.getElementById('sortBy').value;
  const searchQuery = document.getElementById('taskSearchInput').value.toLowerCase().trim();

  // Step A: Filter tasks
  let filteredTasks = tasks.filter(function(task) {
    const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();

    // Check status filter (All, Active, Victories / Completed, Overdue)
    if (currentFilter === 'pending' && task.completed) return false;
    if (currentFilter === 'completed' && !task.completed) return false;
    if (currentFilter === 'overdue' && !isOverdue) return false;

    // Check subject filter
    if (currentSubject !== 'all' && task.subject !== currentSubject) return false;

    // Check search query (matches title, subject, or description)
    if (searchQuery) {
      const matchTitle = task.title.toLowerCase().includes(searchQuery);
      const matchSubj = task.subject.toLowerCase().includes(searchQuery);
      const matchDesc = task.desc && task.desc.toLowerCase().includes(searchQuery);
      if (!matchTitle && !matchSubj && !matchDesc) return false;
    }

    return true;
  });

  // Step B: Sort tasks (including alphabetical A to Z!)
  filteredTasks.sort(function(a, b) {
    if (currentSort === 'date-asc') {
      return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
    } 
    else if (currentSort === 'date-desc') {
      return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
    } 
    else if (currentSort === 'priority-desc') {
      const weights = { high: 3, medium: 2, low: 1 };
      return (weights[b.priority] || 0) - (weights[a.priority] || 0);
    } 
    else if (currentSort === 'priority-asc') {
      const weights = { high: 3, medium: 2, low: 1 };
      return (weights[a.priority] || 0) - (weights[b.priority] || 0);
    } 
    else if (currentSort === 'title-asc') {
      // Alphabetical sorting (A to Z)
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Step C: Show empty state message if no tasks match, otherwise display them
  if (filteredTasks.length === 0) {
    emptyStateContainer.classList.remove('hidden');
  } else {
    emptyStateContainer.classList.add('hidden');
    for (let i = 0; i < filteredTasks.length; i++) {
      const cardHtml = createTaskCardElement(filteredTasks[i]);
      tasksListContainer.appendChild(cardHtml);
    }
  }

  // Update numbers and widgets
  updateStatistics();
  updateSubjectDropdown();
  renderThreatsWidget();
  renderProgressWidget();
}

// 4. Create the HTML structure for a single task card
function createTaskCardElement(task) {
  const card = document.createElement('article');
  card.className = task.completed ? 'task-card is-completed' : 'task-card';
  card.setAttribute('data-priority', task.priority);

  // Check if task is overdue
  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
  if (isOverdue) {
    card.classList.add('is-overdue');
  }

  // Formatting date nicely
  const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No deadline';

  // Setting the inner HTML content of the card
  card.innerHTML = `
    <div class="task-check-wrap">
      <button class="custom-checkbox" onclick="toggleTaskComplete('${task.id}')" title="Mark Complete">✓</button>
    </div>
    <div class="task-body">
      <div class="task-header-row">
        <h4 class="task-title">${escapeHtml(task.title)}</h4>
        <div class="task-actions">
          <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')" title="Delete Mission">🗑️</button>
        </div>
      </div>
      ${task.desc ? `<p class="task-desc">${escapeHtml(task.desc)}</p>` : ''}
      <div class="task-meta-row">
        <span class="badge badge-subject">📚 ${escapeHtml(task.subject)}</span>
        <span class="badge badge-priority-${task.priority}">🔥 ${task.priority.toUpperCase()}</span>
        <span class="badge badge-deadline ${isOverdue ? 'overdue' : ''}">📅 ${formattedDate}</span>
      </div>
    </div>
  `;

  return card;
}

// 5. Update dashboard stats and counters
function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statOverdue').textContent = overdue;

  // Update pill filter badge numbers
  document.getElementById('countAll').textContent = total;
  document.getElementById('countPending').textContent = pending;
  document.getElementById('countCompleted').textContent = completed;
  document.getElementById('countOverdue').textContent = overdue;

  // Sidebar badges
  document.getElementById('sidebarActiveCount').textContent = pending;
  document.getElementById('sidebarThreatCount').textContent = overdue;
}

// 6. Automatically update subject filter dropdown options based on existing tasks
function updateSubjectDropdown() {
  const subjectSelect = document.getElementById('subjectFilter');
  if (!subjectSelect) return;

  const currentSelection = subjectSelect.value;
  
  // Collect unique subjects from tasks array
  let subjects = [];
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].subject && !subjects.includes(tasks[i].subject)) {
      subjects.push(tasks[i].subject);
    }
  }
  subjects.sort();

  // Re-build dropdown options
  subjectSelect.innerHTML = '<option value="all">All Subjects</option>';
  for (let i = 0; i < subjects.length; i++) {
    const opt = document.createElement('option');
    opt.value = subjects[i];
    opt.textContent = subjects[i];
    if (subjects[i] === currentSelection) {
      opt.selected = true;
    }
    subjectSelect.appendChild(opt);
  }
}

// 7. Render incoming threats widget sidebar
function renderThreatsWidget() {
  const container = document.getElementById('threatsListContainer');
  const threatBadge = document.getElementById('threatCountBadge');
  if (!container) return;

  // Get active tasks with deadlines
  let activeTasks = tasks.filter(t => !t.completed && t.dueDate);
  // Sort by nearest deadline date
  activeTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const upcoming = activeTasks.slice(0, 3);
  threatBadge.textContent = activeTasks.length + ' approaching';

  if (upcoming.length === 0) {
    container.innerHTML = `<div class="threats-empty">No incoming threats. All clear!</div>`;
    return;
  }

  container.innerHTML = '';
  for (let i = 0; i < upcoming.length; i++) {
    const task = upcoming[i];
    const isOverdue = new Date(task.dueDate) < new Date();
    
    const item = document.createElement('div');
    item.className = isOverdue ? 'threat-item threat-overdue' : 'threat-item';
    item.innerHTML = `
      <div class="threat-info">
        <h5 class="threat-title">${escapeHtml(task.title)}</h5>
        <span class="threat-due">📅 ${new Date(task.dueDate).toLocaleDateString()}</span>
      </div>
      <button class="threat-strike-btn" onclick="toggleTaskComplete('${task.id}')">Strike</button>
    `;
    container.appendChild(item);
  }
}

// 8. Render progress bar and Shinobi rank
function renderProgressWidget() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('progressBarFill').style.width = percent + '%';
  document.getElementById('progressPercentageText').textContent = 'Ninja Progress: ' + percent + '%';
  document.getElementById('progressMissionsConquered').textContent = completed + ' out of ' + total + ' conquered!';
  document.getElementById('progVictoriesCount').textContent = completed;
  document.getElementById('progRemainingCount').textContent = total - completed;
  document.getElementById('progTotalCount').textContent = total;

  // Determine Ninja Rank based on completed tasks
  let rankName = 'Novice Genin';
  let rankSub = 'Level 1 Shinobi';
  if (completed >= 10) {
    rankName = 'Shadow Master';
    rankSub = 'Level 3 Shinobi Elite';
  } else if (completed >= 5) {
    rankName = 'Deadline Slayer';
    rankSub = 'Level 2 Shinobi Adept';
  }

  document.getElementById('sidebarRankTitle').textContent = rankName;
  document.getElementById('sidebarRankSub').textContent = rankSub;
  document.getElementById('progressRankTag').textContent = rankName;
  document.getElementById('rankTierName').textContent = rankName;
  document.getElementById('rankTierDesc').textContent = 'Conquered ' + completed + ' missions. Keep striking!';
}

// 9. Task Actions: Complete toggle and Delete
function toggleTaskComplete(id) {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) {
      tasks[i].completed = !tasks[i].completed;
      break;
    }
  }
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  if (confirm('Are you sure you want to eliminate this mission?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }
}

// 10. Event Listeners for UI interaction (Buttons, Form, Search, Filters)
function setupEventListeners() {
  // Open modal buttons
  const openModalBtns = document.querySelectorAll('.open-modal-btn');
  for (let i = 0; i < openModalBtns.length; i++) {
    openModalBtns[i].addEventListener('click', function() {
      taskForm.reset();
      taskModalBackdrop.classList.remove('hidden');
    });
  }

  // Close modal buttons
  const closeModal = function() {
    taskModalBackdrop.classList.add('hidden');
  };
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

  // Submit new task form
  taskForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitleInput').value.trim();
    const subject = document.getElementById('taskSubjectInput').value.trim();
    const dueDate = document.getElementById('taskDueDateInput').value;
    const desc = document.getElementById('taskDescInput').value.trim();
    
    const priorityRadio = taskForm.querySelector('input[name="priorityOption"]:checked');
    const priority = priorityRadio ? priorityRadio.value : 'medium';

    if (!title || !subject || !dueDate) {
      alert('Please fill out all required fields.');
      return;
    }

    const newTask = {
      id: 'task_' + Date.now(),
      title: title,
      subject: subject,
      dueDate: dueDate,
      desc: desc,
      priority: priority,
      completed: false
    };

    tasks.unshift(newTask); // Add to beginning of array
    saveTasks();
    renderTasks();
    closeModal();
  });

  // Search input typing listener
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderTasks();
    });
  }

  // Clear search button
  const clearSearchBtn = document.getElementById('searchClearBtn');
  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', function() {
      searchInput.value = '';
      renderTasks();
    });
  }

  // Filter pills (All, Active, Victories, Danger Zone)
  const pillBtns = document.querySelectorAll('.pill-btn');
  for (let i = 0; i < pillBtns.length; i++) {
    pillBtns[i].addEventListener('click', function() {
      for (let j = 0; j < pillBtns.length; j++) {
        pillBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      renderTasks();
    });
  }

  // Subject dropdown change
  const subjectFilter = document.getElementById('subjectFilter');
  if (subjectFilter) {
    subjectFilter.addEventListener('change', function() {
      renderTasks();
    });
  }

  // Sort dropdown change (Includes A to Z alphabetical sorting)
  const sortBy = document.getElementById('sortBy');
  if (sortBy) {
    sortBy.addEventListener('change', function() {
      renderTasks();
    });
  }

  // Theme Toggles (Dark/Light mode)
  const toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  };
  
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const settingsThemeToggle = document.getElementById('settingsThemeToggle');
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (settingsThemeToggle) settingsThemeToggle.addEventListener('click', toggleTheme);

  // Clear All Tasks button
  const clearAllBtn = document.getElementById('clearAllTasksBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all tasks?')) {
        tasks = [];
        saveTasks();
        renderTasks();
      }
    });
  }

  // Reset Sample Tasks button
  const resetSampleBtn = document.getElementById('resetSampleTasksBtn');
  if (resetSampleBtn) {
    resetSampleBtn.addEventListener('click', function() {
      tasks = getSampleTasks();
      saveTasks();
      renderTasks();
    });
  }
}

// Security Helper to Prevent HTML Injection
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}