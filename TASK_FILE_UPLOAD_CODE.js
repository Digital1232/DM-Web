// ═══════════════════════════════════════════════════════════════
// TASK FILE UPLOAD IMPLEMENTATION FOR HOSTINGER
// Domain: https://onedesk.vilpower.com
// ═══════════════════════════════════════════════════════════════

// Configuration
const HOSTINGER_UPLOAD_URL = 'https://onedesk.vilpower.com/api/upload-task-file.php';
const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Upload file to Hostinger server
 * @param {File} file - File object from input
 * @returns {Promise} Upload result with URL, name, size
 */
async function uploadTaskFile(file) {
    if (file.size > MAX_UPLOAD_SIZE) {
        throw new Error(`File too large. Max: 100 MB, Got: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(HOSTINGER_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Upload failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Upload failed');
    }

    return {
        url: data.file_url,
        name: data.file_name,
        size: data.file_size,
        uploadedAt: data.uploaded_at,
        type: file.type
    };
}

/**
 * Get icon and color for file type
 * @param {string} fileName - Name of file
 * @returns {Object} Icon, color, label for display
 */
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        return { icon: 'solar:image-bold', color: '#ec4899', label: 'Image' };
    }
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
        return { icon: 'solar:video-bold', color: '#f59e0b', label: 'Video' };
    }
    if (ext === 'pdf') {
        return { icon: 'solar:file-text-bold', color: '#ef4444', label: 'PDF' };
    }
    
    return { icon: 'solar:file-download-bold', color: '#6366f1', label: 'File' };
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Handle file upload from input or drag-drop
 * @param {Event} event - Change or drop event
 */
async function handleTaskFileUpload(event) {
    const files = event.target?.files || event.dataTransfer?.files;
    if (!files || !files.length) return;

    try {
        for (let file of files) {
            // Show uploading state
            const uploadArea = document.getElementById('et-upload-area');
            if (uploadArea) {
                uploadArea.innerHTML = `
                    <div class="flex items-center justify-center gap-2 text-slate-500">
                        <iconify-icon icon="svg-spinners:ring-resize" width="24"></iconify-icon>
                        <span class="text-sm">Uploading ${file.name}...</span>
                    </div>
                `;
            }

            // Upload file
            const uploaded = await uploadTaskFile(file);
            
            // Add to attachments array
            if (!window.currentTaskAttachments) {
                window.currentTaskAttachments = [];
            }
            window.currentTaskAttachments.push(uploaded);
            
            // Refresh display
            renderTaskAttachments();
        }
        
        toast('File uploaded successfully', 'success');
        
        // Reset file input
        const fileInput = document.getElementById('et-file-input');
        if (fileInput) fileInput.value = '';
        
    } catch (err) {
        console.error('Upload failed:', err);
        toast('Upload failed: ' + err.message, 'error');
        
    } finally {
        // Reset upload area display
        const uploadArea = document.getElementById('et-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <iconify-icon icon="solar:cloud-upload-bold" width="32" class="text-slate-300"></iconify-icon>
                    <p class="text-sm font-bold text-slate-600">
                        Drop files here or <span class="text-indigo-600">click to upload</span>
                    </p>
                    <p class="text-xs text-slate-400">
                        Images, Videos, PDFs up to 100 MB each
                    </p>
                </div>
            `;
        }
    }
}

/**
 * Render list of uploaded attachments
 */
function renderTaskAttachments() {
    const list = document.getElementById('et-attachments-list');
    if (!list) return;

    const attachments = window.currentTaskAttachments || [];
    
    if (attachments.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = attachments.map((att, idx) => {
        const icon = getFileIcon(att.name);
        return `
            <div class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <iconify-icon icon="${icon.icon}" width="20" style="color: ${icon.color}"></iconify-icon>
                
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-700 truncate">${att.name}</p>
                    <p class="text-[9px] text-slate-400">${formatFileSize(att.size)}</p>
                </div>
                
                <a href="${att.url}" target="_blank" 
                    class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg"
                    title="Open file">
                    <iconify-icon icon="solar:link-circle-bold" width="18"></iconify-icon>
                </a>
                
                <button type="button" onclick="removeTaskAttachment(${idx})"
                    class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                    title="Remove">
                    <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Remove attachment from list
 * @param {number} index - Index of attachment to remove
 */
function removeTaskAttachment(index) {
    if (!window.currentTaskAttachments) return;
    const removed = window.currentTaskAttachments.splice(index, 1)[0];
    renderTaskAttachments();
    toast(`Removed: ${removed.name}`, 'info');
}

/**
 * Initialize upload area click handler
 */
function initTaskUploadArea() {
    const uploadArea = document.getElementById('et-upload-area');
    const fileInput = document.getElementById('et-file-input');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
    }
}

/**
 * Render attachments preview for task display
 * @param {Object} task - Task object
 * @returns {string} HTML string of attachments preview
 */
function renderTaskAttachmentsPreview(task) {
    const attachments = task.attachments || [];
    if (!attachments.length) return '';

    return `
        <div class="mt-3 space-y-2 border-t pt-3">
            <p class="text-[9px] font-bold text-slate-400 uppercase">Attachments</p>
            <div class="flex flex-wrap gap-2">
                ${attachments.map(att => {
                    const icon = getFileIcon(att.name);
                    return `
                        <a href="${att.url}" target="_blank" rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-[9px] font-bold text-indigo-700 truncate max-w-xs"
                            title="${att.name}">
                            <iconify-icon icon="${icon.icon}" width="14"></iconify-icon>
                            <span class="truncate">${att.name}</span>
                        </a>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════
// MODIFICATIONS NEEDED IN EXISTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * UPDATE openEditTaskModal() function
 * Add this code at the END of the function (after showModal() call):
 * 
 * window.currentTaskAttachments = task.attachments || [];
 * renderTaskAttachments();
 * 
 * This loads existing attachments when opening task edit modal
 */

/**
 * UPDATE submitTaskUpdate() function
 * Add this to the updates object:
 * 
 * const updates = {
 *     desc: document.getElementById('et-title').value.trim(),
 *     client: document.getElementById('et-client').value,
 *     status: document.getElementById('et-status').value,
 *     priority: document.getElementById('et-priority').value,
 *     duedate: document.getElementById('et-duedate').value || null,
 *     assignee: newAssignee,
 *     assigneeEmail: newAssigneeEmail,
 *     attachments: window.currentTaskAttachments || []  // ← ADD THIS LINE
 * };
 */
