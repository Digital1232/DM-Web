export function eKey(email) { 
    if (!email) return '';
    return email.replace(/[@.]/g, '_'); 
}

export function dmId(e1, e2) { 
    const k = [eKey(e1), eKey(e2)].sort(); 
    return `dm_${k[0]}_${k[1]}`; 
}

let toastTimeout, toastHideTimeout;
/**
 * Show a toast notification.
 * @param {string} msg - Message to display.
 * @param {string} [type='info'] - One of 'info', 'success', 'error'. Determines icon & colors.
 * @param {number} [duration=3000] - How long (ms) the toast stays visible before auto‑hiding.
 */
export function toast(msg, type = 'info', duration = 3000) {
    const t = document.getElementById('toast'),
          ti = document.getElementById('toast-icon'),
          tt = document.getElementById('toast-title'),
          tm = document.getElementById('toast-msg');
    if (!t || !ti || !tt || !tm) return;

    tt.textContent = type.toUpperCase();
    tm.textContent = msg;
    ti.className = `w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        type === 'success' ? 'bg-emerald-100 text-emerald-600' :
        type === 'error'   ? 'bg-rose-100 text-rose-600' :
        'bg-indigo-100 text-indigo-600'
    }`;
    ti.innerHTML = `<iconify-icon icon="${
        type === 'success' ? 'solar:check-circle-bold' :
        type === 'error'   ? 'solar:danger-circle-bold' :
        'solar:info-circle-bold'
    }" width="20"></iconify-icon>`;

    // Reset any existing timers so multiple rapid toasts don’t interfere.
    clearTimeout(toastTimeout);
    clearTimeout(toastHideTimeout);

    // Show the toast by adding the show class
    t.classList.add('show');

    // Auto-hide after the specified duration.
    toastTimeout = setTimeout(() => {
        t.classList.remove('show');
    }, duration);
}

export function formatTime(s) { 
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; 
    return [h, m, sc].map(v => v.toString().padStart(2, '0')).join(':'); 
}

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function csvCell(value) {
    return `"${(value ?? '').toString().replace(/"/g, '""')}"`;
}

export function updateSystemStatus(ok, message, isAutoSync = false) {
    const dot = document.getElementById('system-status-dot');
    const text = document.getElementById('system-status-text');
    const wrapper = text?.parentElement;
    if (!dot || !text || !wrapper) return;

    wrapper.classList.remove('animate-flash-green', 'animate-flash-red');

    if (ok) {
        dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse';
        text.textContent = message || 'SYSTEM ONLINE';
        wrapper.classList.remove('bg-rose-50', 'border-rose-100');
        wrapper.classList.add('bg-slate-50', 'border-slate-200');
        text.classList.remove('text-rose-600');
        text.classList.add('text-slate-500');
        
        if (isAutoSync) {
            wrapper.classList.add('animate-flash-green');
            setTimeout(() => wrapper.classList.remove('animate-flash-green'), 2000);
        }
    } else {
        dot.className = 'w-1.5 h-1.5 rounded-full bg-rose-500';
        text.textContent = message || 'SYNC FAILED';
        wrapper.classList.add('bg-rose-50', 'border-rose-100');
        wrapper.classList.remove('bg-slate-50', 'border-slate-200');
        text.classList.add('text-rose-600');
        text.classList.remove('text-slate-500');

        if (isAutoSync) {
            wrapper.classList.add('animate-flash-red');
            setTimeout(() => wrapper.classList.remove('animate-flash-red'), 2000);
        }
    }
}