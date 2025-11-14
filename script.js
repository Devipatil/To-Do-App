const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const darkModeToggle = document.getElementById('darkModeToggle');
const soundToggle = document.getElementById('soundToggle');
const prioritySelect = document.getElementById('prioritySelect');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.getElementById('clearCompletedButton');
const clearAllButton = document.getElementById('clearAllButton');

let tasks = [];
let currentFilter = 'all';
let draggedItem = null;
let soundEnabled = true;

const STORAGE_KEY = 'todoList_tasks';
const DARK_MODE_KEY = 'todoList_darkMode';
const SOUND_KEY = 'todoList_soundEnabled';

// ***** MODAL FUNCTION *****
function showConfirmModal(message, onOk) {
  const modal = document.getElementById('confirmModal');
  const modalMessage = document.getElementById('confirmModalMessage');
  const okBtn = document.getElementById('confirmModalOk');
  const cancelBtn = document.getElementById('confirmModalCancel');
  let activeElement = document.activeElement;
  let okHandler, cancelHandler;

  modalMessage.textContent = message;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  okBtn.focus();

  okHandler = function() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (activeElement) activeElement.focus();
    okBtn.removeEventListener('click', okHandler);
    cancelBtn.removeEventListener('click', cancelHandler);
    modal.onkeydown = null;
    if (onOk) onOk();
  };

  cancelHandler = function() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    if (activeElement) activeElement.focus();
    okBtn.removeEventListener('click', okHandler);
    cancelBtn.removeEventListener('click', cancelHandler);
    modal.onkeydown = null;
  };

  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', cancelHandler);

  modal.onkeydown = function(e) {
    if (e.key === 'Escape') cancelHandler();
    if (e.key === 'Enter') okHandler();
  };
}
// ***** END MODAL FUNCTION *****

function playSound(type) {
  if (!soundEnabled) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  const now = audioContext.currentTime;

  switch (type) {
    case 'add':
      oscillator.frequency.value = 600;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;
    case 'complete':
      oscillator.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
    case 'delete':
      oscillator.frequency.value = 400;
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  loadDarkMode();
  loadSoundPreference();
  setupEventListeners();
  renderTasks();
});

function setupEventListeners() {
  addButton.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });

  darkModeToggle.addEventListener('click', toggleDarkMode);
  soundToggle.addEventListener('click', toggleSound);

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      taskList.dataset.currentFilter = currentFilter;
      renderTasks();
    });
  });

  clearCompletedButton.addEventListener('click', clearCompleted);
  clearAllButton.addEventListener('click', clearAll);
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem(DARK_MODE_KEY, isDark);
}

function loadDarkMode() {
  const isDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.body.classList.toggle('sound-muted', !soundEnabled);
  localStorage.setItem(SOUND_KEY, soundEnabled);

  if (soundEnabled) {
    playSound('complete');
  }
}

function loadSoundPreference() {
  const savedSound = localStorage.getItem(SOUND_KEY);
  if (savedSound !== null) {
    soundEnabled = savedSound === 'true';
    document.body.classList.toggle('sound-muted', !soundEnabled);
  }
}

function addTask() {
  const taskText = taskInput.value.trim();

  if (taskText === '') {
    alert('Please enter a task!');
    return;
  }

  const task = {
    id: Date.now(),
    text: taskText,
    completed: false,
    priority: prioritySelect.value,
    createdAt: new Date().toISOString(),
  };

  tasks.push(task);
  saveTasks();
  playSound('add');
  taskInput.value = '';
  taskInput.focus();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  playSound('delete');
  renderTasks();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    playSound('complete');
    renderTasks();
  }
}

function startEdit(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = task.text;
    input.focus();

    const handleSave = () => {
      const newText = input.value.trim();
      if (newText !== '') {
        task.text = newText;
        saveTasks();
        playSound('add');
        renderTasks();
      }
    };

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSave();
    });

    input.addEventListener('blur', handleSave);

    const textSpan = document.querySelector(`[data-task-id="${id}"] .task-text`);
    if (textSpan) {
      textSpan.replaceWith(input);
      input.focus();
    }
  }
}

// ***** USE MODAL IN CLEAR FUNCTIONS *****
function clearCompleted() {
  const completedCount = tasks.filter(t => t.completed).length;

  if (completedCount === 0) {
    alert('No completed tasks to clear!');
    return;
  }

  showConfirmModal(
    `Are you sure you want to clear ${completedCount} completed task(s)?`,
    function() {
      tasks = tasks.filter((t) => !t.completed);
      saveTasks();
      playSound('delete');
      renderTasks();
    }
  );
}

function clearAll() {
  if (tasks.length === 0) {
    alert('No tasks to clear!');
    return;
  }

  showConfirmModal(
    `Are you sure you want to delete all ${tasks.length} task(s)? This action cannot be undone.`,
    function() {
      tasks = [];
      saveTasks();
      playSound('delete');
      renderTasks();
    }
  );
}
// ***** END CLEAR FUNCTIONS *****

function renderTasks() {
  taskList.innerHTML = '';

  let filteredTasks = tasks;

  if (currentFilter === 'completed') {
    filteredTasks = tasks.filter((t) => t.completed);
  } else if (currentFilter === 'pending') {
    filteredTasks = tasks.filter((t) => !t.completed);
  }

  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent =
      currentFilter === 'all'
        ? 'No tasks yet. Add one to get started!'
        : currentFilter === 'completed'
          ? 'No completed tasks yet!'
          : 'No pending tasks!';
    taskList.appendChild(emptyState);
    return;
  }

  filteredTasks.forEach((task) => {
    const taskItem = document.createElement('li');
    taskItem.className = `task-item priority-${task.priority}`;
    if (task.completed) taskItem.classList.add('completed');
    taskItem.dataset.taskId = task.id;
    taskItem.draggable = true;

    taskItem.addEventListener('dragstart', () => {
      draggedItem = taskItem;
      taskItem.classList.add('dragging');
    });

    taskItem.addEventListener('dragend', () => {
      taskItem.classList.remove('dragging');
    });

    taskItem.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== taskItem) {
        taskItem.parentNode.insertBefore(draggedItem, taskItem);
      }
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleComplete(task.id));

    const content = document.createElement('div');
    content.className = 'task-content';

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.dataset.taskId = task.id;
    textSpan.textContent = task.text;

    const badge = document.createElement('span');
    badge.className = `task-priority-badge ${task.priority}`;
    badge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    content.appendChild(badge);
    content.appendChild(textSpan);

    const editButton = document.createElement('button');
    editButton.className = 'task-button edit-button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => startEdit(task.id));

    const deleteButton = document.createElement('button');
    deleteButton.className = 'task-button delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    const completeButton = document.createElement('button');
    completeButton.className = 'task-button complete-button';
    completeButton.textContent = task.completed ? 'Undo' : 'Complete';
    completeButton.addEventListener('click', () => toggleComplete(task.id));

    taskItem.appendChild(checkbox);
    taskItem.appendChild(content);
    taskItem.appendChild(editButton);
    taskItem.appendChild(completeButton);
    taskItem.appendChild(deleteButton);

    taskList.appendChild(taskItem);
  });
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tasks = JSON.parse(saved);
    } catch (e) {
      tasks = [];
    }
  }
}
