# Modern UI - Code Integration Snippets

Quick copy-paste code for integrating the modern UI into your existing application.

---

## 1. Navigation Item Management

### Add Active State to Current Page
```javascript
// Call this on page load with the current page identifier
function setActiveNavItem(pageId) {
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active to current page
    const activeItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        
        // If it's a submenu item, expand parent
        if (activeItem.classList.contains('nav-subitem')) {
            const submenu = activeItem.closest('.nav-submenu');
            const parentBtn = submenu.previousElementSibling;
            submenu.classList.add('active');
            parentBtn.classList.add('expanded');
        }
    }
}

// Usage in HTML
<a href="/dashboard" class="nav-item" data-page="dashboard">
    <iconify-icon icon="mdi:view-dashboard"></iconify-icon>
    <span class="nav-item-label">Dashboard</span>
</a>

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    setActiveNavItem('dashboard'); // or whatever current page is
});
```

---

## 2. Notification Badge Management

### Update Badge Count
```javascript
// Update notification badge
function updateBadgeCount(page, count) {
    const item = document.querySelector(`[data-page="${page}"]`);
    let badge = item.querySelector('.nav-item-badge');
    
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-item-badge';
            item.appendChild(badge);
        }
        badge.textContent = count;
        badge.style.display = 'flex';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

// Usage
updateBadgeCount('chat', 5);      // Shows badge with "5"
updateBadgeCount('chat', 0);      // Hides badge
updateBadgeCount('notifications', 1);
```

---

## 3. Dynamic Submenu Creation

### Generate Submenu from Data
```javascript
// Create submenu from array of items
function createSubmenu(parentId, items) {
    const parentBtn = document.querySelector(`[data-submenu-parent="${parentId}"]`);
    
    // Create submenu container if it doesn't exist
    let submenu = parentBtn.nextElementSibling;
    if (!submenu || !submenu.classList.contains('nav-submenu')) {
        submenu = document.createElement('div');
        submenu.className = 'nav-submenu';
        parentBtn.insertAdjacentElement('afterend', submenu);
    }
    
    // Clear existing items
    submenu.innerHTML = '';
    
    // Add new items
    items.forEach(item => {
        const link = document.createElement('a');
        link.href = item.url;
        link.className = 'nav-subitem';
        link.dataset.page = item.id;
        link.innerHTML = `
            <iconify-icon icon="${item.icon}" width="16"></iconify-icon>
            ${item.label}
        `;
        submenu.appendChild(link);
    });
    
    // Make parent expandable
    if (!parentBtn.hasAttribute('onclick')) {
        parentBtn.onclick = (e) => toggleSubmenu(e);
    }
}

// Usage
const taskItems = [
    { id: 'jira', label: 'Jira Tasks', icon: 'mdi:jira', url: '/tasks/jira' },
    { id: 'internal', label: 'Internal Tasks', icon: 'mdi:list', url: '/tasks/internal' },
    { id: 'daily', label: 'Daily Plan', icon: 'mdi:calendar', url: '/tasks/daily' }
];

createSubmenu('tasks', taskItems);
```

---

## 4. Theme Toggle with Local Storage

### Complete Theme Management
```javascript
class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'theme';
        this.DARK_CLASS = 'dark';
    }
    
    // Initialize theme on page load
    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const isDark = saved === 'dark' || 
                      (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        this.setTheme(isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark);
    }
    
    // Set theme
    setTheme(theme) {
        const isDark = theme === 'dark';
        if (isDark) {
            document.documentElement.classList.add(this.DARK_CLASS);
        } else {
            document.documentElement.classList.remove(this.DARK_CLASS);
        }
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.dispatchThemeChangeEvent(isDark);
    }
    
    // Toggle theme
    toggle() {
        const isDark = document.documentElement.classList.contains(this.DARK_CLASS);
        this.setTheme(isDark ? 'light' : 'dark');
        this.updateThemeIcon(!isDark);
    }
    
    // Update theme button icon
    updateThemeIcon(isDark) {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.setAttribute('icon', isDark ? 'mdi:moon-waning-crescent' : 'mdi:white-balance-sunny');
        }
    }
    
    // Dispatch custom event for theme changes
    dispatchThemeChangeEvent(isDark) {
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { isDark }
        }));
    }
    
    // Get current theme
    getCurrent() {
        return document.documentElement.classList.contains(this.DARK_CLASS) ? 'dark' : 'light';
    }
}

// Usage
const themeManager = new ThemeManager();
themeManager.init();

// Listen for theme changes in your components
document.addEventListener('themechange', (e) => {
    console.log('Theme changed to:', e.detail.isDark ? 'dark' : 'light');
    // Update charts, images, etc.
});

// Toggle from anywhere
// themeManager.toggle();
```

---

## 5. Responsive Sidebar Management

### Handle Mobile Sidebar Behavior
```javascript
class SidebarManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.toggleBtn = document.querySelector('.sidebar-toggle');
        this.isMobile = window.innerWidth <= 768;
    }
    
    init() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        window.addEventListener('resize', () => this.handleResize());
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }
    
    toggle() {
        if (this.isMobile) {
            this.sidebar.classList.toggle('mobile-expanded');
            this.mainContent.classList.toggle('sidebar-hidden');
        } else {
            this.sidebar.classList.toggle('collapsed');
            this.mainContent.classList.toggle('sidebar-collapsed');
        }
    }
    
    close() {
        if (this.isMobile && this.sidebar.classList.contains('mobile-expanded')) {
            this.sidebar.classList.remove('mobile-expanded');
            this.mainContent.classList.remove('sidebar-hidden');
        }
    }
    
    handleResize() {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== this.isMobile) {
            this.isMobile = newIsMobile;
            // Reset sidebar state on breakpoint change
            this.sidebar.classList.remove('mobile-expanded', 'collapsed');
            this.mainContent.classList.remove('sidebar-hidden', 'sidebar-collapsed');
        }
    }
    
    handleOutsideClick(e) {
        if (this.isMobile && this.sidebar.classList.contains('mobile-expanded')) {
            if (!this.sidebar.contains(e.target) && !this.toggleBtn.contains(e.target)) {
                this.close();
            }
        }
    }
}

// Usage
const sidebarManager = new SidebarManager();
sidebarManager.init();
```

---

## 6. User Menu Dropdown

### Implement User Menu Actions
```javascript
class UserMenu {
    constructor() {
        this.userCard = document.querySelector('.user-card');
        this.userMenuBtn = document.querySelector('.user-menu-btn');
        this.menu = null;
    }
    
    init() {
        this.userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        document.addEventListener('click', () => this.close());
    }
    
    createMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
            <a href="/profile" class="user-menu-item">
                <iconify-icon icon="mdi:account"></iconify-icon>
                View Profile
            </a>
            <a href="/settings" class="user-menu-item">
                <iconify-icon icon="mdi:cog"></iconify-icon>
                Settings
            </a>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item logout" onclick="handleLogout()">
                <iconify-icon icon="mdi:logout"></iconify-icon>
                Logout
            </button>
        `;
        
        this.userCard.appendChild(menu);
        return menu;
    }
    
    toggle() {
        if (!this.menu) {
            this.menu = this.createMenu();
        }
        this.menu.classList.toggle('active');
    }
    
    close() {
        if (this.menu) {
            this.menu.classList.remove('active');
        }
    }
}

// CSS for user menu dropdown
const userMenuStyles = `
.user-menu-dropdown {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: var(--sidebar-bg);
    border: 1px solid var(--sidebar-border);
    border-radius: 8px;
    min-width: 180px;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s;
    z-index: -1;
}

.user-menu-dropdown.active {
    opacity: 1;
    visibility: visible;
    z-index: 10;
}

.user-menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: var(--sidebar-text-secondary);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: all 0.2s;
    font-size: 0.875rem;
}

.user-menu-item:hover {
    background: var(--sidebar-hover-bg);
    color: var(--sidebar-text-primary);
}

.user-menu-item.logout:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.user-menu-divider {
    height: 1px;
    background: var(--sidebar-border);
    margin: 0.5rem 0;
}
`;

// Usage
const userMenu = new UserMenu();
userMenu.init();
```

---

## 7. Navigation Link Routing

### Handle Navigation with Router
```javascript
class NavRouter {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item, .nav-subitem');
    }
    
    init() {
        this.navItems.forEach(item => {
            if (item.href) {
                item.addEventListener('click', (e) => this.handleNavigation(e, item));
            }
        });
    }
    
    handleNavigation(e, item) {
        const href = item.getAttribute('href');
        
        // Check if it's an internal link
        if (href.startsWith('/') || href.startsWith('./')) {
            e.preventDefault();
            this.navigateTo(href);
        }
    }
    
    navigateTo(url) {
        // If using a router (Vue, React, etc.)
        // this.router.push(url);
        
        // If using vanilla JS
        window.location.href = url;
    }
    
    setActiveFromUrl() {
        const currentPath = window.location.pathname;
        
        this.navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Usage
const navRouter = new NavRouter();
navRouter.init();
navRouter.setActiveFromUrl();
```

---

## 8. Sidebar Persistence

### Remember Sidebar State
```javascript
class SidebarState {
    constructor() {
        this.STORAGE_KEY = 'sidebar-state';
        this.sidebar = document.querySelector('.sidebar');
    }
    
    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved === 'collapsed') {
            this.sidebar.classList.add('collapsed');
        }
        
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.save());
        }
    }
    
    save() {
        const isCollapsed = this.sidebar.classList.contains('collapsed');
        localStorage.setItem(this.STORAGE_KEY, isCollapsed ? 'collapsed' : 'expanded');
    }
    
    reset() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}

// Usage
const sidebarState = new SidebarState();
sidebarState.init();
```

---

## 9. Complete Integration Bundle

### All-in-One Initialization
```javascript
class ModernUI {
    constructor() {
        this.theme = new ThemeManager();
        this.sidebar = new SidebarManager();
        this.userMenu = new UserMenu();
        this.router = new NavRouter();
        this.state = new SidebarState();
    }
    
    init() {
        this.theme.init();
        this.sidebar.init();
        this.userMenu.init();
        this.router.init();
        this.state.init();
        
        // Set active nav based on current page
        this.router.setActiveFromUrl();
        
        console.log('✓ Modern UI initialized');
    }
}

// Single initialization point
const modernUI = new ModernUI();
document.addEventListener('DOMContentLoaded', () => modernUI.init());
```

---

## 10. Keyboard Navigation

### Add Keyboard Support
```javascript
class KeyboardNav {
    constructor() {
        this.navItems = document.querySelectorAll('.nav-item:not([data-submenu-parent])');
        this.currentIndex = 0;
    }
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.next();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.prev();
                break;
            case 'Enter':
                e.preventDefault();
                this.navItems[this.currentIndex]?.click();
                break;
        }
    }
    
    next() {
        this.currentIndex = (this.currentIndex + 1) % this.navItems.length;
        this.focus();
    }
    
    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.navItems.length) % this.navItems.length;
        this.focus();
    }
    
    focus() {
        this.navItems[this.currentIndex]?.focus();
    }
}

// Usage
const keyboardNav = new KeyboardNav();
keyboardNav.init();
```

---

## Quick Paste Templates

### HTML Structure Template
```html
<aside class="sidebar">
    <div class="sidebar-header">
        <a href="/" class="sidebar-logo">
            <div class="sidebar-logo-icon">●</div>
            <span>App Name</span>
        </a>
        <button class="sidebar-toggle" onclick="toggleSidebar()">
            <iconify-icon icon="mdi:menu"></iconify-icon>
        </button>
    </div>
    
    <nav class="nav-container">
        <div class="nav-section">
            <div class="nav-section-title">Menu</div>
            <!-- Add nav items here -->
        </div>
        <div class="nav-spacer"></div>
    </nav>
    
    <div class="user-card">
        <div class="user-avatar">AB</div>
        <div class="user-info">
            <div class="user-name">User Name</div>
            <div class="user-email">user@example.com</div>
        </div>
        <button class="user-menu-btn">
            <iconify-icon icon="mdi:dots-vertical"></iconify-icon>
        </button>
    </div>
</aside>

<main class="main-content">
    <div class="main-content-padding">
        <!-- Page content -->
    </div>
</main>
```

### CSS Override Template
```css
/* Override colors in your main CSS file */
:root {
    --accent-primary: #3b82f6;      /* Your brand color */
    --sidebar-bg: #ffffff;          /* Light sidebar */
    --sidebar-text-primary: #1e293b;
}

html.dark {
    --accent-primary: #818cf8;      /* Dark mode accent */
    --sidebar-bg: #2d3748;          /* Dark sidebar */
    --sidebar-text-primary: #f1f5f9;
}
```

---

## Testing Checklist

- [ ] Sidebar collapses/expands on click
- [ ] Mobile sidebar behaves correctly
- [ ] Theme toggle works
- [ ] Active nav item highlighted
- [ ] Submenu items expand/collapse
- [ ] User menu opens/closes
- [ ] Badge counts update
- [ ] Keyboard navigation works
- [ ] All links are clickable
- [ ] Responsive on all breakpoints

---

**Version:** 1.0.0  
**Last Updated:** July 14, 2026
