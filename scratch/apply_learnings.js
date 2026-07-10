const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../index.html');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add Skipped to INTERNAL_TASK_STATUSES
content = content.replace(
    /const INTERNAL_TASK_STATUSES = \['To do', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress', 'Shoot Completed', 'Shoot Cancelled', 'In Progress', 'Completed', 'Hold', 'Learnings', 'Discussion'\];/g,
    `const INTERNAL_TASK_STATUSES = ['To do', 'Shoot Needed', 'Shoot Planned', 'Shoot In Progress', 'Shoot Completed', 'Shoot Cancelled', 'In Progress', 'Completed', 'Hold', 'Learnings', 'Discussion', 'Skipped'];`
);

// 2. Modals to add before <script type="module">
const modalsHtml = `
    <!-- Morning Learning Completion Modal -->
    <dialog id="ml-completion-modal" class="bg-white dark:bg-slate-900 rounded-3xl p-0 w-full max-w-lg shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 border border-slate-200 dark:border-slate-800">
        <form method="dialog" onsubmit="submitMorningLearningCompletion(event)" class="flex flex-col">
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
                <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:book-bookmark-bold" class="text-indigo-500"></iconify-icon>
                        Complete Morning Learning
                    </h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Share your learnings from today's session.</p>
                </div>
                <button type="button" onclick="document.getElementById('ml-completion-modal').close()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <iconify-icon icon="solar:close-circle-bold" width="24"></iconify-icon>
                </button>
            </div>
            <div class="p-6 space-y-5">
                <input type="hidden" id="ml-completion-task-id" name="taskId">
                <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <iconify-icon icon="solar:document-text-bold" class="text-slate-400"></iconify-icon> What did you learn today? <span class="text-rose-500">*</span>
                    </label>
                    <textarea id="ml-completion-content" name="content" required rows="4" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white placeholder:text-slate-400 resize-none transition-all" placeholder="Briefly describe your key takeaways..."></textarea>
                </div>
                <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <iconify-icon icon="solar:link-bold" class="text-slate-400"></iconify-icon> Video URL (Optional)
                    </label>
                    <input type="url" id="ml-completion-url" name="videoUrl" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white placeholder:text-slate-400 transition-all" placeholder="https://youtube.com/...">
                </div>
            </div>
            <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl flex justify-end gap-3">
                <button type="button" onclick="document.getElementById('ml-completion-modal').close()" class="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" class="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-colors flex items-center gap-2">
                    Submit Learning <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                </button>
            </div>
        </form>
    </dialog>

    <!-- Morning Learning Skip Modal -->
    <dialog id="ml-skip-modal" class="bg-white dark:bg-slate-900 rounded-3xl p-0 w-full max-w-lg shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 border border-slate-200 dark:border-slate-800">
        <form method="dialog" onsubmit="submitMorningLearningSkip(event)" class="flex flex-col">
            <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
                <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <iconify-icon icon="solar:skip-next-bold" class="text-amber-500"></iconify-icon>
                        Skip Morning Learning
                    </h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Please provide a reason for skipping today's session.</p>
                </div>
                <button type="button" onclick="document.getElementById('ml-skip-modal').close()" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <iconify-icon icon="solar:close-circle-bold" width="24"></iconify-icon>
                </button>
            </div>
            <div class="p-6 space-y-5">
                <input type="hidden" id="ml-skip-task-id" name="taskId">
                <div class="space-y-2">
                    <label class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <iconify-icon icon="solar:clipboard-text-bold" class="text-slate-400"></iconify-icon> Reason for Skipping <span class="text-rose-500">*</span>
                    </label>
                    <textarea id="ml-skip-reason" name="reason" required rows="4" class="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-white placeholder:text-slate-400 resize-none transition-all" placeholder="e.g., Working on high priority shoot..."></textarea>
                </div>
            </div>
            <div class="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-3xl flex justify-end gap-3">
                <button type="button" onclick="document.getElementById('ml-skip-modal').close()" class="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" class="px-5 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-200 dark:shadow-none transition-colors flex items-center gap-2">
                    Confirm Skip <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>
                </button>
            </div>
        </form>
    </dialog>
`;

if (!content.includes('ml-completion-modal')) {
    content = content.replace('<script type="module">', modalsHtml + '\\n    <script type="module">');
}

// 3. updateInternalTaskStatus patch
const oldInternalLogic = \`                if (isMorningLearningTask(task) && (newStatus === 'Completed' || isInternalDone(newStatus))) {
                    task.description = task.description || task.notes || '';
                    await completeMorningLearningTask(task);
                    return;
                }\`;

const newInternalLogic = \`                if (isMorningLearningTask(task)) {
                    if (newStatus === 'Completed' || isInternalDone(newStatus)) {
                        openMorningLearningCompletionModal(task);
                        // Reset dropdown visually, will be updated properly after submit
                        task.status = oldStatus;
                        renderInternalTasks();
                        renderDailyPlan();
                        return;
                    }
                    if (newStatus === 'Skipped') {
                        openMorningLearningSkipModal(task);
                        task.status = oldStatus;
                        renderInternalTasks();
                        renderDailyPlan();
                        return;
                    }
                }\`;

content = content.replace(oldInternalLogic, newInternalLogic);

// 4. Update completeMorningLearningTask signature and logic
const oldCompleteMorningLearningTask = \`            async function completeMorningLearningTask(task) {
                if (!task || !isMorningLearningTask(task) || !db) return false;
                const today = todayIso();
                if (task.lastCompletedDate === today) return true;

                const userEmail = (task.assigneeEmail || task.userId || currentUser?.email || '').toLowerCase();
                const user = allUsersMap.get(userEmail) || {
                    email: task.assigneeEmail || task.userId,
                    name: task.assignee || 'Employee'
                };
                const userSlot = getMorningLearningSlot(userEmail);
                const userTitle = getMorningLearningTitle(userEmail);
                const notes = (task.description || task.notes || '').trim();
                const details = notes
                    ? \\\`\\\${notes}\\\\n\\\\n- Attendance: Morning learning session (\\\${userSlot}) on \\\${today}.\\\`
                    : \\\`Attended morning learning session (\\\${userSlot}) on \\\${today}.\\\`;

                await push(ref(db, 'worksync/learning_logs'), {
                    title: \\\`\\\${userTitle} - \\\${user.name}\\\`,
                    details,
                    logType: 'attendance',
                    sessionType: 'Morning Learning',
                    timeSlot: userSlot,
                    userId: user.email,
                    userName: user.name,
                    taskId: task.id,
                    attendanceDate: today,
                    createdAt: Date.now()
                });\`;

const newCompleteMorningLearningTask = \`            async function completeMorningLearningTask(task, learningContent = '', videoUrl = '') {
                if (!task || !isMorningLearningTask(task) || !db) return false;
                const today = todayIso();
                if (task.lastCompletedDate === today) return true;

                const userEmail = (task.assigneeEmail || task.userId || currentUser?.email || '').toLowerCase();
                const user = allUsersMap.get(userEmail) || {
                    email: task.assigneeEmail || task.userId,
                    name: task.assignee || 'Employee'
                };
                const userSlot = getMorningLearningSlot(userEmail);
                const userTitle = getMorningLearningTitle(userEmail);
                
                let details = \\\`Attended morning learning session (\\\${userSlot}) on \\\${today}.\\\`;
                if (learningContent) details += \\\`\\\\n\\\\nLearnings:\\\\n\\\${learningContent}\\\`;
                if (videoUrl) details += \\\`\\\\n\\\\nVideo/Resource URL:\\\\n\\\${videoUrl}\\\`;

                const logData = {
                    title: \\\`\\\${userTitle} - \\\${user.name}\\\`,
                    details,
                    logType: 'attendance',
                    sessionType: 'Morning Learning',
                    timeSlot: userSlot,
                    userId: user.email,
                    userName: user.name,
                    taskId: task.id,
                    attendanceDate: today,
                    createdAt: Date.now()
                };
                if (videoUrl) logData.videoUrl = videoUrl;

                await push(ref(db, 'worksync/learning_logs'), logData);\`;

content = content.replace(oldCompleteMorningLearningTask, newCompleteMorningLearningTask);


// 5. Add new functions for modals and skipping
const modalFunctions = \`
            function openMorningLearningCompletionModal(task) {
                document.getElementById('ml-completion-task-id').value = task.id;
                document.getElementById('ml-completion-content').value = task.description || task.notes || '';
                document.getElementById('ml-completion-url').value = '';
                document.getElementById('ml-completion-modal').showModal();
            }

            async function submitMorningLearningCompletion(event) {
                event.preventDefault();
                const form = event.target;
                const taskId = form.taskId.value;
                const content = form.content.value.trim();
                const videoUrl = form.videoUrl.value.trim();
                const task = tasks.find(t => t.id === taskId);
                
                if (task) {
                    const btn = form.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.innerHTML = '<iconify-icon icon="line-md:loading-twotone-loop"></iconify-icon> Submitting...';
                    
                    try {
                        await completeMorningLearningTask(task, content, videoUrl);
                        document.getElementById('ml-completion-modal').close();
                    } catch (e) {
                        toast('Error saving completion details', 'error');
                        console.error(e);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = 'Submit Learning <iconify-icon icon="solar:check-circle-bold"></iconify-icon>';
                    }
                }
            }

            function openMorningLearningSkipModal(task) {
                document.getElementById('ml-skip-task-id').value = task.id;
                document.getElementById('ml-skip-reason').value = '';
                document.getElementById('ml-skip-modal').showModal();
            }

            async function submitMorningLearningSkip(event) {
                event.preventDefault();
                const form = event.target;
                const taskId = form.taskId.value;
                const reason = form.reason.value.trim();
                const task = tasks.find(t => t.id === taskId);
                
                if (task) {
                    const btn = form.querySelector('button[type="submit"]');
                    btn.disabled = true;
                    btn.innerHTML = '<iconify-icon icon="line-md:loading-twotone-loop"></iconify-icon> Submitting...';
                    
                    try {
                        await skipMorningLearningTask(task, reason);
                        document.getElementById('ml-skip-modal').close();
                    } catch (e) {
                        toast('Error saving skip details', 'error');
                        console.error(e);
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = 'Confirm Skip <iconify-icon icon="solar:arrow-right-bold"></iconify-icon>';
                    }
                }
            }

            async function skipMorningLearningTask(task, reason) {
                if (!task || !isMorningLearningTask(task) || !db) return false;
                const today = todayIso();
                
                const userEmail = (task.assigneeEmail || task.userId || currentUser?.email || '').toLowerCase();
                const user = allUsersMap.get(userEmail) || {
                    email: task.assigneeEmail || task.userId,
                    name: task.assignee || 'Employee'
                };
                const userSlot = getMorningLearningSlot(userEmail);
                const userTitle = getMorningLearningTitle(userEmail);
                
                await push(ref(db, 'worksync/learning_logs'), {
                    title: \\\`[SKIPPED] \\\${userTitle} - \\\${user.name}\\\`,
                    details: \\\`Skipped morning learning session (\\\${userSlot}) on \\\${today}.\\\\n\\\\nReason: \\\${reason}\\\`,
                    logType: 'skipped',
                    sessionType: 'Skipped Morning Learning',
                    timeSlot: userSlot,
                    userId: user.email,
                    userName: user.name,
                    taskId: task.id,
                    attendanceDate: today,
                    createdAt: Date.now()
                });

                const ownerKey = eKey(task.userId || user.email);
                await update(ref(db, \\\`worksync/manual_tasks/\\\${ownerKey}/\\\${task.id}\\\`), {
                    status: 'Skipped',
                    lastCompletedDate: today, // Treat skip as handled for today
                    completedAt: Date.now(),
                    skipReason: reason
                });

                const idx = tasks.findIndex(t => t.id === task.id);
                if (idx >= 0) {
                    tasks[idx].status = 'Skipped';
                    tasks[idx].lastCompletedDate = today;
                    tasks[idx].skipReason = reason;
                }

                renderInternalTasks();
                renderDailyPlan();
                if (activeView === 'learnings-org') renderLearningsOrgPanel();
                toast('Morning learning marked as skipped', 'info');
                return true;
            }
\`;

// Insert the modal functions before updateInternalTaskStatus to make them available
if (!content.includes('function openMorningLearningCompletionModal')) {
    content = content.replace('async function updateInternalTaskStatus', modalFunctions + '\\n            async function updateInternalTaskStatus');
}

// Export functions on window for modal onsubmit events
if (!content.includes('window.submitMorningLearningCompletion')) {
    content = content.replace(
        'window.updateInternalTaskStatus = updateInternalTaskStatus;',
        'window.updateInternalTaskStatus = updateInternalTaskStatus;\\n            window.submitMorningLearningCompletion = submitMorningLearningCompletion;\\n            window.submitMorningLearningSkip = submitMorningLearningSkip;'
    );
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully updated index.html with Morning Learning improvements.');
