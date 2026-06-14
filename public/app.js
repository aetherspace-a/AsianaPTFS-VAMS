// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Reveal Animations
function initReveal() {
    const revealObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

// Toast Notifications
function showToast(msg, duration = 3500) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// Auth Initialization for Nav
async function initNavAuth() {
    try {
        const res = await fetch('/api/user');
        const data = await res.json();
        const loginBtn = document.getElementById('login-btn');
        const navUser = document.getElementById('nav-user');
        
        if (res.ok && data.user) {
            const u = data.user;
            if (loginBtn) loginBtn.style.display = 'none';
            if (navUser) {
                navUser.classList.add('visible');
                const avatar = document.getElementById('nav-avatar');
                const username = document.getElementById('nav-username');
                if (avatar) avatar.src = u.avatar;
                if (username) username.textContent = u.username;
            }
            return u;
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (navUser) navUser.classList.remove('visible');
        }
    } catch (e) {
        console.error('Auth check failed:', e);
    }
    return null;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initReveal();
    initNavAuth();
});
