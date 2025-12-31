// Dashboard JavaScript
let currentUser = null;
let widgets = [];
let feedbackItems = [];
let feedbackChart = null;
let submissionsChart = null;
let performanceChart = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await initDashboard();
});

async function initDashboard() {
  // Check authentication
  currentUser = await requireAuth();
  if (!currentUser) return;
  
  // Load user data
  await loadUserData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load initial data
  await loadDashboardData();
  
  // Initialize charts
  initializeCharts();
  
  // Hide loading screen
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('dashboard-container').classList.remove('hidden');
  
  // Check for dark mode preference
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('setting-dark-mode').checked = true;
  }
}

// Load User Data
async function loadUserData() {
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-name').textContent = currentUser.email.split('@')[0];
  document.getElementById('settings-email').value = currentUser.email;
  
  const createdAt = new Date(currentUser.created_at);
  document.getElementById('settings-joined').value = createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Load Dashboard Data
async function loadDashboardData() {
  try {
    await Promise.all([
      loadWidgets(),
      loadFeedback(),
      loadAnalytics()
    ]);
    updateStats();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

// Load Widgets
async function loadWidgets() {
  const { data, error } = await supabaseClient
    .from('widgets')
    .select('*')
    .eq('admin_id', currentUser.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  widgets = data || [];
  renderWidgets();
}

// Render Widgets
function renderWidgets() {
  const container = document.getElementById('widgets-grid');
  
  if (widgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state-large">
        <span class="material-icons">widgets</span>
        <h3>No widgets yet</h3>
        <p>Create your first widget to start collecting feedback</p>
        <button class="btn-primary" onclick="document.getElementById('create-widget-btn').click()">
          Create Widget
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = widgets.map(widget => `
    <div class="widget-card" data-widget-id="${widget.id}">
      <div class="widget-card-header">
        <span class="widget-status ${widget.is_active ? '' : 'inactive'}">
          <span class="material-icons" style="font-size: 14px;">${widget.is_active ? 'check_circle' : 'cancel'}</span>
          ${widget.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <p class="widget-url">${widget.site_url}</p>
      <div class="widget-stats">
        <div class="widget-stat">
          <div class="widget-stat-value" id="widget-feedback-${widget.id}">0</div>
          <div class="widget-stat-label">Feedback</div>
        </div>
        <div class="widget-stat">
          <div class="widget-stat-value" id="widget-views-${widget.id}">0</div>
          <div class="widget-stat-label">Views</div>
        </div>
      </div>
      <div class="widget-actions">
        <button onclick="showEmbedCode('${widget.id}')">
          <span class="material-icons" style="font-size: 16px;">code</span>
          Embed
        </button>
        <button onclick="toggleWidgetStatus('${widget.id}', ${!widget.is_active})">
          <span class="material-icons" style="font-size: 16px;">${widget.is_active ? 'pause' : 'play_arrow'}</span>
          ${widget.is_active ? 'Pause' : 'Activate'}
        </button>
        <button onclick="deleteWidget('${widget.id}')">
          <span class="material-icons" style="font-size: 16px;">delete</span>
          Delete
        </button>
      </div>
    </div>
  `).join('');
  
  // Load stats for each widget
  widgets.forEach(widget => loadWidgetStats(widget.id));
}

// Load Widget Stats
async function loadWidgetStats(widgetId) {
  try {
    // Load feedback count
    const { count: feedbackCount } = await supabaseClient
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('widget_id', widgetId);
    
    // Load views count
    const { count: viewsCount } = await supabaseClient
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('widget_id', widgetId)
      .eq('event_type', 'widget_opened');
    
    // Update UI
    const feedbackEl = document.getElementById(`widget-feedback-${widgetId}`);
    const viewsEl = document.getElementById(`widget-views-${widgetId}`);
    
    if (feedbackEl) feedbackEl.textContent = feedbackCount || 0;
    if (viewsEl) viewsEl.textContent = viewsCount || 0;
  } catch (error) {
    console.error('Error loading widget stats:', error);
  }
}

// Load Feedback
async function loadFeedback() {
  const widgetIds = widgets.map(w => w.id);
  if (widgetIds.length === 0) return;
  
  const { data, error } = await supabaseClient
    .from('feedback')
    .select('*')
    .in('widget_id', widgetIds)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  
  feedbackItems = data || [];
  renderFeedback(feedbackItems);
}

// Render Feedback
function renderFeedback(items) {
  const container = document.getElementById('feedback-list');
  
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state-large">
        <span class="material-icons">chat_bubble_outline</span>
        <h3>No feedback yet</h3>
        <p>Feedback will appear here once users start submitting through your widget</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = items.map(item => {
    const initials = (item.user_email || 'A')[0].toUpperCase();
    const timeAgo = getTimeAgo(new Date(item.created_at));
    
    return `
      <div class="feedback-item" onclick="showFeedbackDetail('${item.id}')">
        <div class="feedback-avatar">${initials}</div>
        <div class="feedback-content">
          <div class="feedback-header-info">
            <span class="feedback-email">${item.user_email || 'Anonymous'}</span>
            <span class="feedback-time">${timeAgo}</span>
          </div>
          <p class="feedback-message">${escapeHtml(item.message)}</p>
          <div class="feedback-meta">
            <span>
              <span class="material-icons">link</span>
              ${new URL(item.page_url).pathname}
            </span>
            ${item.browser ? `
              <span>
                <span class="material-icons">web</span>
                ${item.browser}
              </span>
            ` : ''}
            ${item.device ? `
              <span>
                <span class="material-icons">devices</span>
                ${item.device}
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Show Feedback Detail
function showFeedbackDetail(feedbackId) {
  const feedback = feedbackItems.find(f => f.id === feedbackId);
  if (!feedback) return;
  
  const modal = document.getElementById('feedback-modal');
  const detailContainer = document.getElementById('feedback-detail');
  
  const widget = widgets.find(w => w.id === feedback.widget_id);
  const date = new Date(feedback.created_at).toLocaleString();
  
  detailContainer.innerHTML = `
    <div class="form-group">
      <label>From</label>
      <input type="text" value="${feedback.user_email || 'Anonymous'}" readonly>
    </div>
    
    <div class="form-group">
      <label>Message</label>
      <textarea rows="5" readonly>${escapeHtml(feedback.message)}</textarea>
    </div>
    
    <div class="form-group">
      <label>Page URL</label>
      <input type="text" value="${feedback.page_url}" readonly>
    </div>
    
    <div class="form-group">
      <label>Widget</label>
      <input type="text" value="${widget?.site_url || 'Unknown'}" readonly>
    </div>
    
    <div class="form-group">
      <label>Browser</label>
      <input type="text" value="${feedback.browser || 'Unknown'}" readonly>
    </div>
    
    <div class="form-group">
      <label>Device</label>
      <input type="text" value="${feedback.device || 'Unknown'}" readonly>
    </div>
    
    <div class="form-group">
      <label>Submitted</label>
      <input type="text" value="${date}" readonly>
    </div>
  `;
  
  modal.classList.remove('hidden');
}

// Load Analytics
async function loadAnalytics() {
  // This would load analytics data
  // For now, we'll use the loaded feedback data
  updateRecentActivity();
}

// Update Stats
function updateStats() {
  document.getElementById('stat-total-feedback').textContent = feedbackItems.length;
  document.getElementById('stat-active-widgets').textContent = widgets.filter(w => w.is_active).length;
  
  // Calculate views from events (would be loaded from events table)
  document.getElementById('stat-widget-views').textContent = Math.floor(feedbackItems.length * 2.5);
  
  // Calculate response rate (dummy calculation)
  const rate = feedbackItems.length > 0 ? Math.min(100, Math.floor((feedbackItems.length / (feedbackItems.length * 10)) * 100)) : 0;
  document.getElementById('stat-response-rate').textContent = rate + '%';
}

// Update Recent Activity
function updateRecentActivity() {
  const container = document.getElementById('recent-activity');
  const recentFeedback = feedbackItems.slice(0, 5);
  
  if (recentFeedback.length === 0) {
    container.innerHTML = '<p class="empty-state">No recent activity</p>';
    return;
  }
  
  container.innerHTML = recentFeedback.map(item => {
    const timeAgo = getTimeAgo(new Date(item.created_at));
    return `
      <div class="activity-item">
        <div class="activity-icon">
          <span class="material-icons">feedback</span>
        </div>
        <div class="activity-content">
          <strong>New feedback received</strong>
          <small>${item.user_email || 'Anonymous'} • ${timeAgo}</small>
        </div>
      </div>
    `;
  }).join('');
}

// Initialize Charts
function initializeCharts() {
  // Feedback Over Time Chart
  const feedbackCtx = document.getElementById('feedback-chart');
  if (feedbackCtx) {
    feedbackChart = new Chart(feedbackCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Feedback',
          data: [12, 19, 3, 5, 2, 3, 7],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  // Submissions Chart
  const submissionsCtx = document.getElementById('submissions-chart');
  if (submissionsCtx) {
    submissionsChart = new Chart(submissionsCtx, {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Submissions',
          data: [45, 52, 38, 61],
          backgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
  
  // Performance Chart
  const performanceCtx = document.getElementById('performance-chart');
  if (performanceCtx) {
    performanceChart = new Chart(performanceCtx, {
      type: 'doughnut',
      data: {
        labels: ['Views', 'Opens', 'Submissions'],
        datasets: [{
          data: [300, 150, 45],
          backgroundColor: ['#6366f1', '#8b5cf6', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);
    });
  });
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '/auth.html';
  });
  
  // Theme Toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Refresh
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadDashboardData();
    showToast('Data refreshed', 'success');
  });
  
  // Mobile Menu
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  });
  
  // Create Widget
  document.getElementById('create-widget-btn').addEventListener('click', () => {
    document.getElementById('widget-modal').classList.remove('hidden');
  });
  
  // Close Widget Modal
  document.getElementById('close-widget-modal').addEventListener('click', () => {
    document.getElementById('widget-modal').classList.add('hidden');
    document.getElementById('widget-form').reset();
  });
  
  // Widget Form Submit
  document.getElementById('widget-form').addEventListener('submit', handleCreateWidget);
  
  // Close Feedback Modal
  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('feedback-modal').classList.add('hidden');
  });
  
  // Close Embed Modal
  document.getElementById('close-embed-modal').addEventListener('click', () => {
    document.getElementById('embed-modal').classList.add('hidden');
  });
  
  // Copy Embed Code
  document.getElementById('copy-embed-btn').addEventListener('click', copyEmbedCode);
  
  // Feedback Search
  document.getElementById('feedback-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = feedbackItems.filter(item => 
      item.message.toLowerCase().includes(query) ||
      (item.user_email && item.user_email.toLowerCase().includes(query)) ||
      item.page_url.toLowerCase().includes(query)
    );
    renderFeedback(filtered);
  });
  
  // Feedback Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      filterFeedback(filter);
    });
  });
  
  // Settings
  document.getElementById('setting-dark-mode').addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }
  });
  
  // Delete Account
  document.getElementById('delete-account-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Implement account deletion
      showToast('Account deletion is not yet implemented', 'info');
    }
  });
}

// Switch Section
function switchSection(sectionName) {
  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
  
  // Update content
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`section-${sectionName}`).classList.add('active');
  
  // Update page title
  const titles = {
    overview: 'Overview',
    feedback: 'Feedback',
    widgets: 'Widgets',
    analytics: 'Analytics',
    settings: 'Settings'
  };
  document.getElementById('page-title').textContent = titles[sectionName] || sectionName;
  
  // Close mobile menu
  document.querySelector('.sidebar').classList.remove('mobile-open');
}

// Handle Create Widget
async function handleCreateWidget(e) {
  e.preventDefault();
  
  const btn = e.target.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  
  btn.disabled = true;
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');
  
  try {
    const { data, error } = await supabaseClient
      .from('widgets')
      .insert([{
        admin_id: currentUser.id,
        site_url: document.getElementById('widget-site-url').value,
        theme: document.getElementById('widget-theme').value,
        position: document.getElementById('widget-position').value,
        is_active: true
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    widgets.unshift(data);
    renderWidgets();
    
    document.getElementById('widget-modal').classList.add('hidden');
    document.getElementById('widget-form').reset();
    
    showToast('Widget created successfully!', 'success');
    
    // Show embed code
    setTimeout(() => showEmbedCode(data.id), 500);
    
  } catch (error) {
    console.error('Error creating widget:', error);
    showToast('Failed to create widget', 'error');
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

// Show Embed Code
function showEmbedCode(widgetId) {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;
  
  const embedCode = `<script src="https://feedbackflow.dippanbhusal.tech/embed.js" data-widget-id="${widgetId}" data-position="${widget.position}" data-theme="${widget.theme}" defer></script>`;
  
  document.querySelector('#embed-code-content code').textContent = embedCode;
  document.getElementById('embed-modal').classList.remove('hidden');
}

// Copy Embed Code
function copyEmbedCode() {
  const code = document.querySelector('#embed-code-content code').textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-embed-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons">check</span> Copied!';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
    }, 2000);
    
    showToast('Embed code copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy code', 'error');
  });
}

// Toggle Widget Status
async function toggleWidgetStatus(widgetId, newStatus) {
  try {
    const { error } = await supabaseClient
      .from('widgets')
      .update({ is_active: newStatus })
      .eq('id', widgetId);
    
    if (error) throw error;
    
    const widget = widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.is_active = newStatus;
      renderWidgets();
    }
    
    showToast(`Widget ${newStatus ? 'activated' : 'paused'}`, 'success');
  } catch (error) {
    console.error('Error updating widget:', error);
    showToast('Failed to update widget', 'error');
  }
}

// Delete Widget
async function deleteWidget(widgetId) {
  if (!confirm('Are you sure you want to delete this widget? All feedback data will be lost.')) {
    return;
  }
  
  try {
    const { error } = await supabaseClient
      .from('widgets')
      .delete()
      .eq('id', widgetId);
    
    if (error) throw error;
    
    widgets = widgets.filter(w => w.id !== widgetId);
    renderWidgets();
    
    showToast('Widget deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting widget:', error);
    showToast('Failed to delete widget', 'error');
  }
}

// Filter Feedback
function filterFeedback(filter) {
  let filtered = [...feedbackItems];
  const now = new Date();
  
  switch (filter) {
    case 'today':
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate.toDateString() === now.toDateString();
      });
      break;
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => new Date(item.created_at) >= weekAgo);
      break;
    case 'unread':
      // Would filter by unread status if implemented
      break;
  }
  
  renderFeedback(filtered);
}

// Toggle Theme
function toggleTheme() {
  const isDark = document.body.hasAttribute('data-theme');
  
  if (isDark) {
    document.body.removeAttribute('data-theme');
    document.querySelector('#theme-toggle .material-icons').textContent = 'dark_mode';
    localStorage.setItem('darkMode', 'false');
    document.getElementById('setting-dark-mode').checked = false;
  } else {
    document.body.setAttribute('data-theme', 'dark');
    document.querySelector('#theme-toggle .material-icons').textContent = 'light_mode';
    localStorage.setItem('darkMode', 'true');
    document.getElementById('setting-dark-mode').checked = true;
  }
}

// Show Toast
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };
  
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons">${icons[type]}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'Just now';
}
