// Widget JavaScript
let widgetId = null;
let parentUrl = null;
let theme = 'light';

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
widgetId = urlParams.get('widgetId');
parentUrl = urlParams.get('parentUrl');
theme = urlParams.get('theme') || 'auto';

// Apply theme
if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.body.setAttribute('data-theme', 'dark');
}

// DOM Elements
const feedbackForm = document.getElementById('feedback-form');
const successState = document.getElementById('success-state');
const errorState = document.getElementById('error-state');
const submitForm = document.getElementById('submit-form');
const messageTextarea = document.getElementById('feedback-message');
const charCountSpan = document.getElementById('char-count');

// Character counter
messageTextarea.addEventListener('input', () => {
  const count = messageTextarea.value.length;
  charCountSpan.textContent = count;
  
  if (count > 4500) {
    charCountSpan.style.color = '#ef4444';
  } else {
    charCountSpan.style.color = '';
  }
});

// Form submission
submitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const message = messageTextarea.value.trim();
  const email = document.getElementById('feedback-email').value.trim();
  
  if (!message) {
    showError('Please enter your feedback');
    return;
  }
  
  if (message.length > 5000) {
    showError('Feedback is too long. Maximum 5000 characters.');
    return;
  }
  
  await submitFeedback(message, email);
});

// Submit Feedback
async function submitFeedback(message, email) {
  const btn = document.getElementById('submit-btn');
  const btnText = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.spinner');
  
  btn.disabled = true;
  btnText.classList.add('hidden');
  spinner.classList.remove('hidden');
  
  try {
    // Get browser and device info
    const browser = getBrowserInfo();
    const device = getDeviceInfo();
    
    // Submit to Supabase
    const { error } = await supabaseClient
      .from('feedback')
      .insert([{
        widget_id: widgetId,
        message: message,
        page_url: parentUrl || document.referrer,
        user_email: email || null,
        browser: browser,
        device: device
      }]);
    
    if (error) throw error;
    
    // Track event
    await trackEvent('feedback_submitted');
    
    // Show success
    showSuccess();
    
    // Notify parent
    notifyParent('feedbackflow_submitted', { message });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    showError('Failed to submit feedback. Please try again.');
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    spinner.classList.add('hidden');
  }
}

// Show Success State
function showSuccess() {
  feedbackForm.classList.add('hidden');
  errorState.classList.add('hidden');
  successState.classList.remove('hidden');
}

// Show Error State
function showError(errorMessage) {
  feedbackForm.classList.add('hidden');
  successState.classList.add('hidden');
  errorState.classList.remove('hidden');
  document.getElementById('error-message').textContent = errorMessage;
}

// Reset Form
function resetForm() {
  submitForm.reset();
  charCountSpan.textContent = '0';
  feedbackForm.classList.remove('hidden');
  successState.classList.add('hidden');
  errorState.classList.add('hidden');
}

// Event Listeners
document.getElementById('close-widget').addEventListener('click', () => {
  notifyParent('feedbackflow_close');
});

document.getElementById('send-another').addEventListener('click', resetForm);

document.getElementById('retry-btn').addEventListener('click', () => {
  resetForm();
});

document.getElementById('close-error').addEventListener('click', () => {
  notifyParent('feedbackflow_close');
});

// Track Event
async function trackEvent(eventType) {
  try {
    await supabaseClient
      .from('events')
      .insert([{
        widget_id: widgetId,
        event_type: eventType,
        metadata: {
          parentUrl: parentUrl,
          timestamp: new Date().toISOString()
        }
      }]);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

// Notify Parent Window
function notifyParent(type, data = {}) {
  if (window.parent) {
    window.parent.postMessage({
      type: type,
      data: data
    }, '*');
  }
}

// Get Browser Info
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    browser = 'Opera';
  }
  
  return browser;
}

// Get Device Info
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  if (/mobile/i.test(ua)) {
    return 'Mobile';
  } else if (/tablet/i.test(ua)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
}

// Track widget loaded event on initialization
if (widgetId) {
  trackEvent('widget_loaded');
}
