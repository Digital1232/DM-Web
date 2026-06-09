import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { eKey } from './utils.js';
import { knownUserByEmail } from './config.js';

let auth, db;
let _currentUser = null;

export function initAuth(appAuth, appDb, onLoginCallback, onLogoutCallback) {
    auth = appAuth;
    db = appDb;

    onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
            const snap = await get(ref(db, `worksync/users/${eKey(fbUser.email)}`));
            if (snap.exists()) {
                _currentUser = { ...snap.val(), ...(knownUserByEmail(fbUser.email) || {}), uid: fbUser.uid };
                localStorage.setItem('worksync_user', JSON.stringify(_currentUser));
                document.documentElement.classList.add('has-user');
                onLoginCallback(_currentUser);
            } else {
                console.warn(`User ${fbUser.email} authenticated but not found in DB. Forcing logout.`);
                await onLogoutCallback();
            }
        } else {
            await onLogoutCallback();
        }
    });
}

export async function login(email, pass) {
    if (!auth) throw new Error("Auth not initialized");
    await signInWithEmailAndPassword(auth, email, pass);
}

export async function logout() {
    if (db && _currentUser) {
        await update(ref(db, `worksync/users/${eKey(_currentUser.email)}`), { online: false });
    }
    if (auth) await signOut(auth);
}