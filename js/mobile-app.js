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

    /**
     * Draggable Floating Chat Bubble (Mobile Touch & Desktop Mouse)
     */
    function setupDraggableChatBubble() {
        const btn = document.getElementById('float-chat-btn');
        if (!btn) {
            setTimeout(setupDraggableChatBubble, 200);
            return;
        }

        const POS_STORAGE_KEY = 'worksync_chat_bubble_pos';
        const DRAG_THRESHOLD = 6;

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;
        let currentLeft = 0;
        let currentTop = 0;
        let justDragged = false;

        // Restore saved position if valid
        function restorePosition() {
            try {
                const saved = localStorage.getItem(POS_STORAGE_KEY);
                if (saved) {
                    const pos = JSON.parse(saved);
                    const btnW = btn.offsetWidth || 56;
                    const btnH = btn.offsetHeight || 56;
                    const maxW = window.innerWidth - btnW - 8;
                    const maxH = window.innerHeight - btnH - (window.innerWidth < 768 ? 75 : 8);

                    if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                        const validX = Math.max(8, Math.min(pos.left, maxW));
                        const validY = Math.max(8, Math.min(pos.top, maxH));
                        btn.style.left = `${validX}px`;
                        btn.style.top = `${validY}px`;
                        btn.style.right = 'auto';
                        btn.style.bottom = 'auto';
                    }
                }
            } catch (err) {
                console.warn('[ChatBubble] Error restoring position:', err);
            }
        }

        // Pointer / Touch / Mouse down
        function onPointerDown(e) {
            if (e.button !== undefined && e.button !== 0) return; // Only primary button
            isDragging = true;
            justDragged = false;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;

            const rect = btn.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            currentLeft = initialLeft;
            currentTop = initialTop;

            document.addEventListener('pointermove', onPointerMove, { passive: false });
            document.addEventListener('pointerup', onPointerUp, { passive: false });
            document.addEventListener('pointercancel', onPointerUp, { passive: false });
            document.addEventListener('touchmove', onPointerMove, { passive: false });
            document.addEventListener('touchend', onPointerUp, { passive: false });
        }

        // Move
        function onPointerMove(e) {
            if (!isDragging) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            if (!justDragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                justDragged = true;
                btn.classList.add('is-dragging');
            }

            if (justDragged) {
                if (e.cancelable) e.preventDefault();

                const btnW = btn.offsetWidth || 56;
                const btnH = btn.offsetHeight || 56;
                const minX = 8;
                const maxX = window.innerWidth - btnW - 8;
                const minY = 8;
                const maxY = window.innerHeight - btnH - (window.innerWidth < 768 ? 75 : 8);

                currentLeft = Math.max(minX, Math.min(initialLeft + dx, maxX));
                currentTop = Math.max(minY, Math.min(initialTop + dy, maxY));

                btn.style.left = `${currentLeft}px`;
                btn.style.top = `${currentTop}px`;
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }
        }

        // Release / Up
        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;

            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            document.removeEventListener('touchmove', onPointerMove);
            document.removeEventListener('touchend', onPointerUp);

            if (justDragged) {
                btn.classList.remove('is-dragging');

                // Snap to nearest side edge (left or right) for clean native feel
                const btnW = btn.offsetWidth || 56;
                const midScreen = window.innerWidth / 2;
                const snapLeft = (currentLeft + btnW / 2) < midScreen ? 12 : (window.innerWidth - btnW - 12);
                
                btn.style.transition = 'left 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), top 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
                btn.style.left = `${snapLeft}px`;

                setTimeout(() => {
                    btn.style.transition = '';
                }, 300);

                try {
                    localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ left: snapLeft, top: currentTop }));
                } catch (e) {}

                // Keep justDragged true briefly to block instant click trigger
                setTimeout(() => {
                    justDragged = false;
                }, 100);
            }
        }

        // Block click event if it was a drag
        btn.addEventListener('click', (e) => {
            if (justDragged) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);

        // Attach pointer/touch start
        btn.addEventListener('pointerdown', onPointerDown);
        btn.addEventListener('touchstart', onPointerDown, { passive: true });

        // Restore on start and window resize
        restorePosition();
        window.addEventListener('resize', restorePosition);
    }

    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupSwitchViewHook();
            setupSidebarHook();
            setupSwipeToDismiss();
            setupDraggableChatBubble();
            // Periodic badge sync
            setInterval(syncMobileDrawerBadges, 2500);
        });
    } else {
        setupSwitchViewHook();
        setupSidebarHook();
        setupSwipeToDismiss();
        setupDraggableChatBubble();
        setInterval(syncMobileDrawerBadges, 2500);
    }
})();

