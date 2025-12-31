/**
 * FeedbackFlow Widget Embed Script
 * Version: 1.0.0
 * Optimized for Vercel deployment with automatic URL detection
 */
(function() {
  'use strict';
  
  // Get script configuration
  const script = document.currentScript || document.querySelector('script[src*="embed.js"]');
  const widgetId = script.getAttribute('data-widget-id') || 'default';
  const position = script.getAttribute('data-position') || 'bottom-right';
  const theme = script.getAttribute('data-theme') || 'auto';
  
  // Detect deployment URL
  const getBaseURL = () => {
    const scriptSrc = script.src;
    const url = new URL(scriptSrc);
    return `${url.protocol}//${url.host}`;
  };
  
  const BASE_URL = getBaseURL();
  const WIDGET_URL = `${BASE_URL}/public/widget.html`;
  
  // Position configuration
  const positions = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' }
  };
  
  // Create widget container
  const container = document.createElement('div');
  container.id = `feedbackflow-${widgetId}`;
  container.style.cssText = `
    position: fixed;
    ${Object.entries(positions[position] || positions['bottom-right'])
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')};
    z-index: 999999;
    transition: all 0.3s ease;
  `;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${WIDGET_URL}?widgetId=${widgetId}&theme=${theme}&parentUrl=${encodeURIComponent(window.location.href)}`;
  iframe.style.cssText = `
    width: 400px;
    max-width: calc(100vw - 40px);
    height: 550px;
    max-height: calc(100vh - 40px);
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    background: white;
    display: none;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  iframe.title = 'FeedbackFlow Widget';
  iframe.allow = 'clipboard-write';
  
  // Create trigger button
  const button = document.createElement('button');
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  button.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    transition: all 0.3s ease;
    outline: none;
  `;
  button.setAttribute('aria-label', 'Open Feedback Widget');
  button.setAttribute('title', 'Send Feedback');
  
  // Button hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
  });
  
  // Widget state
  let isOpen = false;
  
  // Toggle widget
  const toggleWidget = () => {
    isOpen = !isOpen;
    
    if (isOpen) {
      iframe.style.display = 'block';
      setTimeout(() => {
        iframe.style.opacity = '1';
        iframe.style.transform = 'translateY(0)';
      }, 10);
      button.style.transform = 'rotate(180deg)';
      
      // Track widget opened event
      trackEvent('widget_opened');
    } else {
      iframe.style.opacity = '0';
      iframe.style.transform = 'translateY(20px)';
      setTimeout(() => {
        iframe.style.display = 'none';
      }, 300);
      button.style.transform = 'rotate(0deg)';
    }
  };
  
  // Event tracking
  const trackEvent = (eventType) => {
    try {
      window.postMessage({
        type: 'feedbackflow_event',
        event: eventType,
        widgetId: widgetId,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }, '*');
    } catch (error) {
      console.warn('FeedbackFlow: Event tracking failed', error);
    }
  };
  
  // Listen for messages from iframe
  window.addEventListener('message', (event) => {
    // Security check
    if (event.origin !== BASE_URL) return;
    
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'feedbackflow_close':
        toggleWidget();
        break;
        
      case 'feedbackflow_submitted':
        trackEvent('feedback_submitted');
        setTimeout(() => toggleWidget(), 2000);
        break;
        
      case 'feedbackflow_error':
        trackEvent('widget_error');
        console.error('FeedbackFlow error:', data);
        break;
        
      case 'feedbackflow_resize':
        if (data?.height) {
          iframe.style.height = `${Math.min(data.height, window.innerHeight - 40)}px`;
        }
        break;
    }
  });
  
  // Button click handler
  button.addEventListener('click', toggleWidget);
  
  // Keyboard accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      toggleWidget();
    }
  });
  
  // Build widget
  container.appendChild(iframe);
  container.appendChild(button);
  
  // Inject into page
  const injectWidget = () => {
    if (document.body) {
      document.body.appendChild(container);
      trackEvent('widget_loaded');
      console.log('✓ FeedbackFlow widget loaded successfully');
    } else {
      setTimeout(injectWidget, 100);
    }
  };
  
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
  
  // Responsive handling
  const handleResize = () => {
    const isMobile = window.innerWidth < 480;
    if (isMobile) {
      iframe.style.width = 'calc(100vw - 40px)';
      iframe.style.height = 'calc(100vh - 40px)';
    } else {
      iframe.style.width = '400px';
      iframe.style.height = '550px';
    }
  };
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
})();
