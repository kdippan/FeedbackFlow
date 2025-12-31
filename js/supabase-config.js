/**
 * Supabase Client Configuration
 * Automatically uses Vercel-injected environment variables
 * 
 * SECURITY: The anon key is safe to expose (protected by RLS policies)
 */

// Vercel automatically injects these when Supabase integration is enabled
const SUPABASE_URL = 
  typeof process !== 'undefined' && process.env?.SUPABASE_URL ||
  window.ENV?.SUPABASE_URL ||
  'YOUR_FALLBACK_URL'; // Replace with your actual URL for local dev

const SUPABASE_ANON_KEY = 
  typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY ||
  window.ENV?.SUPABASE_ANON_KEY ||
  'YOUR_FALLBACK_KEY'; // Replace with your actual key for local dev

// Get current deployment URL for auth redirects
const getDeploymentURL = () => {
  if (typeof window === 'undefined') return '';
  
  const { hostname, protocol, port } = window.location;
  
  // Production or Vercel preview deployment
  if (hostname.includes('vercel.app') || hostname.includes('dippanbhusal.tech')) {
    return `${protocol}//${hostname}`;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  }
  
  // Custom domain
  return `${protocol}//${hostname}`;
};

// Initialize Supabase client with Vercel-injected credentials
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    redirectTo: `${getDeploymentURL()}/auth.html`
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'FeedbackFlow'
    }
  }
});

// Helper: Get current authenticated user
async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Helper: Require authentication or redirect to login
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
    window.location.href = '/auth.html';
    return null;
  }
  return user;
}

// Helper: Handle post-authentication redirects
async function handleAuthRedirect() {
  const redirectPath = sessionStorage.getItem('redirectAfterAuth');
  sessionStorage.removeItem('redirectAfterAuth');
  
  if (redirectPath && redirectPath !== '/auth.html') {
    window.location.href = redirectPath;
  } else {
    window.location.href = '/dashboard.html';
  }
}

// Development logging
if (window.location.hostname === 'localhost') {
  console.log('🔐 FeedbackFlow initialized');
  console.log('📍 Deployment URL:', getDeploymentURL());
  console.log('✅ Using Vercel-injected Supabase credentials');
}
