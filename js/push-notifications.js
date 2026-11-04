/**
 * One Desk - Capacitor & FCM Push Notifications Manager
 * Enables background and lock-screen push notifications on mobile devices.
 */

(function () {
    'use strict';

    const PushManager = {
        isInitialized: false,
        currentToken: null,

        /**
         * Initialize push notifications listener for Native Mobile & PWA
         */
        async init() {
            if (this.isInitialized) return;
            this.isInitialized = true;

            const isCapacitor = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

            if (isCapacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
                await this.initCapacitorPush();
            } else {
                console.log('[PushManager] Running in web environment. Native push notifications active on Mobile build.');
            }
        },

        /**
         * Initialize Capacitor native push notifications
         */
        async initCapacitorPush() {
            const PushNotifications = window.Capacitor.Plugins.PushNotifications;
            if (!PushNotifications) return;

            try {
                // Request Permission
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== 'granted') {
                    console.warn('[PushManager] Push notification permission not granted:', permStatus.receive);
                    return;
                }

                // Register with FCM
                await PushNotifications.register();

                // Setup Listeners
                PushNotifications.addListener('registration', async (token) => {
                    console.log('[PushManager] Push registration success. Token:', token.value);
                    PushManager.currentToken = token.value;
                    await PushManager.saveTokenToFirebase(token.value);
                });

                PushNotifications.addListener('registrationError', (error) => {
                    console.error('[PushManager] Push registration error:', error);
                });

                // Foreground push received
                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('[PushManager] Foreground Push received:', notification);
                    if (typeof window.toast === 'function') {
                        window.toast(`${notification.title || 'Alert'}: ${notification.body || ''}`, 'info');
                    }
                });

                // User tapped on notification from lock screen / notification shade
                PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                    console.log('[PushManager] Push action performed:', notification);
                    const data = notification.notification.data || {};
                    PushManager.handleNotificationTap(data);
                });

            } catch (err) {
                console.error('[PushManager] Error initializing PushNotifications:', err);
            }
        },

        /**
         * Store device FCM token in Firebase Realtime Database under user's profile
         */
        async saveTokenToFirebase(token) {
            try {
                const currentUser = window.currentUser || (window.auth && window.auth.currentUser);
                if (!currentUser || !token) return;

                const userKey = currentUser.uid || (currentUser.email ? currentUser.email.replace(/[.@]/g, '_') : 'anonymous');
                if (window.db && window.ref && window.set) {
                    const tokenPath = `worksync/fcm_tokens/${userKey}/${token.replace(/[.#$[\]]/g, '_')}`;
                    await window.set(window.ref(window.db, tokenPath), {
                        token: token,
                        updatedAt: Date.now(),
                        platform: 'android',
                        userEmail: currentUser.email || ''
                    });
                    console.log('[PushManager] Device token stored in Firebase for user:', userKey);
                }
            } catch (err) {
                console.warn('[PushManager] Could not save FCM token to DB:', err);
            }
        },

        /**
         * Handle notification click routing
         */
        handleNotificationTap(data) {
            try {
                if (data.view && typeof window.switchView === 'function') {
                    window.switchView(data.view);
                }
                if (data.conversationId && typeof window.openConversationById === 'function') {
                    window.openConversationById(data.conversationId);
                }
            } catch (e) {
                console.warn('[PushManager] Error routing from notification tap:', e);
            }
        },

        /**
         * Send push notification to specific user or all users via backend API
         */
        async triggerPushNotification({ userKey, title, body, data }) {
            try {
                // If on local dev/static server (e.g. Live Server on 127.0.0.1 / localhost),
                // static servers do not have backend serverless execution for POST /api/send-push (returns 405 Method Not Allowed).
                const isLocalDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    && (window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443');

                if (isLocalDev && !window.ENABLE_LOCAL_PUSH_SERVER) {
                    return { success: false, reason: 'skipped_local_dev' };
                }

                const response = await fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userKey,
                        title,
                        body,
                        data: data || {}
                    })
                });

                if (!response.ok) {
                    return { success: false, status: response.status };
                }

                return await response.json();
            } catch (err) {
                // Silently fallback without noisy console warning
                return { success: false, error: err?.message };
            }
        }
    };

    window.PushManager = PushManager;

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PushManager.init());
    } else {
        PushManager.init();
    }
})();
