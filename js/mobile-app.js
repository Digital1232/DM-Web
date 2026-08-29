/**
 * One Desk - Mobile App UI Controller
 * Provides native-like bottom navigation, slide-up sheet menu drawer, and badge synchronization.
 */

(function () {
    'use strict';

    // Map of views to their corresponding bottom tab ID (if in core 4 tabs)
    const CORE_TABS_MAP = {
        'dashboard': 'mob-tab-dashboard',
        'tasks': 'mob-tab-tasks',
        'internal-tasks': 'mob-tab-tasks',
        'dailyplan': 'mob-tab-tasks',
        'completed-tasks': 'mob-tab-tasks',
        'weekly-matrix': 'mob-tab-matrix',
        'chat': 'mob-tab-chat'
    };

    /**
     * Updates active tab state in the mobile bottom navigation bar
     */
    function updateMobileNavActive(view) {
        const allTabs = document.querySelectorAll('.mobile-tab-btn');
        allTabs.forEach(tab => tab.classList.remove('tab-active'));

        const targetTabId = CORE_TABS_MAP[view];
        if (targetTabId) {
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
                targetTab.classList.add('tab-active');
            }
        } else {
            // If view is not in core 4, highlight the 'More' tab
            const moreTab = document.getElementById('mob-tab-more');
            if (moreTab) {
                moreTab.classList.add('tab-active');
            }
        }
    }

    /**
     * Open Mobile "More" Sheet Menu Drawer
     */
    function openMobileAppMenu() {
        const overlay = document.getElementById('mobile-drawer-overlay');
        const sheet = document.getElementById('mobile-drawer-sheet');
        if (overlay && sheet) {
            overlay.classList.add('active');
            sheet.classList.add('active');
            document.body.style.overflow = 'hidden';
            syncMobileDrawerProfile();
            syncMobileDrawerBadges();
        }
    }

    /**
     * Close Mobile "More" Sheet Menu Drawer
     */
    function closeMobileAppMenu() {
        const overlay = document.getElementById('mobile-drawer-overlay');
        const sheet = document.getElementById('mobile-drawer-sheet');
        if (overlay && sheet) {
            overlay.classList.remove('active');
            sheet.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Toggle Mobile Drawer
     */
    function toggleMobileAppMenu() {
        const sheet = document.getElementById('mobile-drawer-sheet');
        if (sheet && sheet.classList.contains('active')) {
            closeMobileAppMenu();
        } else {
            openMobileAppMenu();
        }
    }

    /**
     * Select view from mobile drawer & auto close
     */
    function selectMobileAppView(view) {
        closeMobileAppMenu();
        if (typeof window.switchView === 'function') {
            window.switchView(view);
        }
        updateMobileNavActive(view);
    }

    /**
     * Synchronize profile info inside the mobile drawer
     */
    function syncMobileDrawerProfile() {
        try {
            const userAvatar = document.getElementById('user-avatar');
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            const drawerAvatar = document.getElementById('mob-drawer-avatar');
            const drawerName = document.getElementById('mob-drawer-user-name');
            const drawerRole = document.getElementById('mob-drawer-user-role');

            if (userAvatar && drawerAvatar && userAvatar.src) {
                drawerAvatar.src = userAvatar.src;
            }
            if (userName && drawerName) {
                drawerName.textContent = userName.textContent || 'User';
            }
            if (userRole && drawerRole) {
                drawerRole.textContent = userRole.textContent || 'Member';
            }
        } catch (err) {
            console.warn('[MobileApp] Profile sync error:', err);
        }
    }

    /**
     * Synchronize badge counters to mobile bottom tabs and drawer tiles
     */
    function syncMobileDrawerBadges() {
        try {
            // Task badge sync
            const desktopTaskBadge = document.getElementById('task-badge');
            const mobTaskTabBadge = document.getElementById('mob-task-badge');
            const mobTaskDrawerBadge = document.getElementById('mob-drawer-task-badge');

            if (desktopTaskBadge && !desktopTaskBadge.classList.contains('hidden') && desktopTaskBadge.textContent !== '0') {
                const count = desktopTaskBadge.textContent;
                if (mobTaskTabBadge) {
                    mobTaskTabBadge.textContent = count;
                    mobTaskTabBadge.classList.remove('hidden');
                }
                if (mobTaskDrawerBadge) {
                    mobTaskDrawerBadge.textContent = count;
                    mobTaskDrawerBadge.classList.remove('hidden');
                }
            } else {
                if (mobTaskTabBadge) mobTaskTabBadge.classList.add('hidden');
                if (mobTaskDrawerBadge) mobTaskDrawerBadge.classList.add('hidden');
            }

            // Chat badge sync
            const desktopChatBadge = document.getElementById('chat-badge') || document.getElementById('fcp-unread-badge');
            const mobChatTabBadge = document.getElementById('mob-chat-badge');
            if (desktopChatBadge && !desktopChatBadge.classList.contains('hidden') && desktopChatBadge.textContent !== '0') {
                const count = desktopChatBadge.textContent;
                if (mobChatTabBadge) {
                    mobChatTabBadge.textContent = count;
                    mobChatTabBadge.classList.remove('hidden');
                }
            } else {
                if (mobChatTabBadge) mobChatTabBadge.classList.add('hidden');
            }

            // Role based sections in drawer
            const isAdminUser = typeof window.isAdmin === 'function' && window.isAdmin();
            const adminSection = document.getElementById('mob-drawer-admin-section');
            if (adminSection) {
                if (isAdminUser) {
                    adminSection.classList.remove('hidden');
                } else {
                    adminSection.classList.add('hidden');
                }
            }
        } catch (err) {
            console.warn('[MobileApp] Badge sync error:', err);
        }
    }

    // Expose global methods
    window.updateMobileNavActive = updateMobileNavActive;
    window.openMobileAppMenu = openMobileAppMenu;
    window.closeMobileAppMenu = closeMobileAppMenu;
    window.toggleMobileAppMenu = toggleMobileAppMenu;
    window.selectMobileAppView = selectMobileAppView;
    window.syncMobileDrawerBadges = syncMobileDrawerBadges;

    // Wrap switchView to automatically update mobile active tab
    function setupSwitchViewHook() {
        if (typeof window.switchView === 'function') {
            const originalSwitchView = window.switchView;
            window.switchView = function (view) {
                const result = originalSwitchView.apply(this, arguments);
                updateMobileNavActive(view);
                return result;
            };
        } else {
            setTimeout(setupSwitchViewHook, 100);
        }
    }

    // Wrap toggleSidebar on mobile to open app menu drawer
    function setupSidebarHook() {
        if (typeof window.toggleSidebar === 'function') {
            const originalToggleSidebar = window.toggleSidebar;
            window.toggleSidebar = function () {
                if (window.innerWidth < 768) {
                    toggleMobileAppMenu();
                } else {
                    originalToggleSidebar.apply(this, arguments);
                }
            };
        } else {
            setTimeout(setupSidebarHook, 100);
        }
    }

    // Touch gesture swipe-down to dismiss drawer
    function setupSwipeToDismiss() {
        const sheet = document.getElementById('mobile-drawer-sheet');
        if (!sheet) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        sheet.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startY = touch.clientY;
            isDragging = (sheet.scrollTop <= 0);
        }, { passive: true });

        sheet.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            if (deltaY > 0) {
                sheet.style.transform = `translateY(${deltaY}px)`;
            }
        }, { passive: true });

        sheet.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const deltaY = currentY - startY;
            sheet.style.transform = '';
            if (deltaY > 100) {
                closeMobileAppMenu();
            }
        }, { passive: true });
    }

    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupSwitchViewHook();
            setupSidebarHook();
            setupSwipeToDismiss();
            // Periodic badge sync
            setInterval(syncMobileDrawerBadges, 2500);
        });
    } else {
        setupSwitchViewHook();
        setupSidebarHook();
        setupSwipeToDismiss();
        setInterval(syncMobileDrawerBadges, 2500);
    }
})();

