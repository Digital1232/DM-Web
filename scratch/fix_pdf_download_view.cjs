const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update downloadFile function
const oldDownloadFile = `            async function downloadFile(url, fileName) {
                if (!url) return;
                const cleanName = fileName || 'download';
                const isPdf = cleanName.toLowerCase().endsWith('.pdf') || (url || '').toLowerCase().includes('.pdf');
                const name = (isPdf && !cleanName.toLowerCase().endsWith('.pdf')) ? (cleanName + '.pdf') : cleanName;
                
                try {
                    if (url.startsWith('data:')) {
                        const blobType = isPdf ? 'application/pdf' : undefined;
                        const blob = dataURLtoBlob(url, blobType);
                        if (blob) {
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                            return;
                        }
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        return;
                    }

                    if (typeof toast === 'function') toast('Downloading file...', 'info');
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                    const blob = await response.blob();
                    
                    // Force PDF mime type if extension is .pdf or if blob mime type is postscript/illustrator
                    let finalBlob = blob;
                    if (isPdf || name.toLowerCase().endsWith('.pdf') || (blob.type && (blob.type.includes('postscript') || blob.type.includes('illustrator')))) {
                        finalBlob = new Blob([blob], { type: 'application/pdf' });
                    }
                    
                    const blobUrl = URL.createObjectURL(finalBlob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                } catch (err) {
                    console.warn('Blob download failed, attempting formatted direct link:', err);
                    let finalUrl = url;
                    if (url.includes('cloudinary.com')) {
                        const cleanEncName = encodeURIComponent(name);
                        if (url.includes('/image/upload/')) {
                            finalUrl = url.replace('/image/upload/', \`/image/upload/fl_attachment:\${cleanEncName}/\`);
                        } else if (url.includes('/upload/')) {
                            finalUrl = url.replace('/upload/', \`/upload/fl_attachment:\${cleanEncName}/\`);
                        }
                    }
                    const a = document.createElement('a');
                    a.href = finalUrl;
                    a.download = name;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }`;

const newDownloadFile = `            async function downloadFile(url, fileName) {
                if (!url) return;
                const cleanName = fileName || 'download';
                const isPdf = cleanName.toLowerCase().endsWith('.pdf') || (url || '').toLowerCase().includes('.pdf');
                const name = (isPdf && !cleanName.toLowerCase().endsWith('.pdf')) ? (cleanName + '.pdf') : cleanName;
                
                try {
                    if (url.startsWith('data:')) {
                        const blobType = isPdf ? 'application/pdf' : undefined;
                        const blob = dataURLtoBlob(url, blobType);
                        if (blob) {
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                            return;
                        }
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        return;
                    }

                    if (typeof toast === 'function') toast('Downloading file...', 'info');

                    let fetchUrl = url;
                    if (isPdf && fetchUrl.includes('cloudinary.com') && fetchUrl.includes('/image/upload/')) {
                        const cleanEncName = encodeURIComponent(name);
                        fetchUrl = fetchUrl.replace('/image/upload/', \`/image/upload/f_pdf,fl_attachment:\${cleanEncName}/\`);
                    }

                    const response = await fetch(fetchUrl);
                    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                    const blob = await response.blob();
                    
                    // Force PDF mime type if extension is .pdf or if blob mime type is postscript/illustrator
                    let finalBlob = blob;
                    if (isPdf || name.toLowerCase().endsWith('.pdf') || (blob.type && (blob.type.includes('postscript') || blob.type.includes('illustrator')))) {
                        finalBlob = new Blob([blob], { type: 'application/pdf' });
                    }
                    
                    const blobUrl = URL.createObjectURL(finalBlob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                } catch (err) {
                    console.warn('Blob download failed, attempting formatted direct link:', err);
                    let finalUrl = url;
                    if (url.includes('cloudinary.com')) {
                        const cleanEncName = encodeURIComponent(name);
                        if (url.includes('/image/upload/')) {
                            finalUrl = url.replace('/image/upload/', \`/image/upload/f_pdf,fl_attachment:\${cleanEncName}/\`);
                        } else if (url.includes('/upload/')) {
                            finalUrl = url.replace('/upload/', \`/upload/f_pdf,fl_attachment:\${cleanEncName}/\`);
                        }
                    }
                    const a = document.createElement('a');
                    a.href = finalUrl;
                    a.download = name;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }`;

// 2. Update viewOrOpenPdf
const oldViewOrOpenPdf = `            async function viewOrOpenPdf(url, fileName) {
                if (!url) return;
                const cleanName = fileName || 'document.pdf';
                const isPdf = cleanName.toLowerCase().endsWith('.pdf') || (url || '').toLowerCase().includes('.pdf');
                const name = (isPdf && !cleanName.toLowerCase().endsWith('.pdf')) ? (cleanName + '.pdf') : cleanName;
                
                if (url.startsWith('data:')) {
                    const blobType = isPdf ? 'application/pdf' : undefined;
                    const blob = dataURLtoBlob(url, blobType);
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                        return;
                    }
                    window.open(url, '_blank');
                    return;
                }

                if (isPdf) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            const blob = await response.blob();
                            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            window.open(blobUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                            return;
                        }
                    } catch(e) {}
                }
                
                let targetUrl = url;
                if (isPdf && url.includes('cloudinary.com') && url.includes('/image/upload/')) {
                    targetUrl = url.replace('/image/upload/', \`/image/upload/fl_attachment:\${encodeURIComponent(name)}/\`);
                }
                window.open(targetUrl, '_blank');
            }`;

const newViewOrOpenPdf = `            async function viewOrOpenPdf(url, fileName) {
                if (!url) return;
                const cleanName = fileName || 'document.pdf';
                const isPdf = cleanName.toLowerCase().endsWith('.pdf') || (url || '').toLowerCase().includes('.pdf');
                const name = (isPdf && !cleanName.toLowerCase().endsWith('.pdf')) ? (cleanName + '.pdf') : cleanName;
                
                if (url.startsWith('data:')) {
                    const blobType = isPdf ? 'application/pdf' : undefined;
                    const blob = dataURLtoBlob(url, blobType);
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                        return;
                    }
                    window.open(url, '_blank');
                    return;
                }

                if (isPdf) {
                    try {
                        let fetchUrl = url;
                        if (fetchUrl.includes('cloudinary.com') && fetchUrl.includes('/image/upload/')) {
                            fetchUrl = fetchUrl.replace('/image/upload/', '/image/upload/f_pdf/');
                        }
                        const response = await fetch(fetchUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                            const blobUrl = URL.createObjectURL(pdfBlob);
                            window.open(blobUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                            return;
                        }
                    } catch(e) {}
                }
                
                let targetUrl = url;
                if (isPdf && url.includes('cloudinary.com') && url.includes('/image/upload/')) {
                    targetUrl = url.replace('/image/upload/', '/image/upload/f_pdf/');
                }
                window.open(targetUrl, '_blank');
            }`;

// 3. Update getSafePdfUrl
const oldGetSafePdfUrl = `            function getSafePdfUrl(url, name) {
                if (!url) return '';
                let strUrl = String(url);
                const isPdf = (name || strUrl).toLowerCase().includes('.pdf');
                if (isPdf && strUrl.includes('cloudinary.com') && strUrl.includes('/image/upload/')) {
                    const cleanName = encodeURIComponent(name || 'document.pdf');
                    return strUrl.replace('/image/upload/', \`/image/upload/fl_attachment:\${cleanName}/\`);
                }
                return strUrl;
            }`;

const newGetSafePdfUrl = `            function getSafePdfUrl(url, name, forDownload = false) {
                if (!url) return '';
                let strUrl = String(url);
                const isPdf = (name || strUrl).toLowerCase().includes('.pdf');
                if (isPdf && strUrl.includes('cloudinary.com') && strUrl.includes('/image/upload/')) {
                    const cleanName = encodeURIComponent(name || 'document.pdf');
                    if (forDownload) {
                        return strUrl.replace('/image/upload/', \`/image/upload/f_pdf,fl_attachment:\${cleanName}/\`);
                    }
                    return strUrl.replace('/image/upload/', '/image/upload/f_pdf/');
                }
                return strUrl;
            }`;

content = content.replace(oldDownloadFile, newDownloadFile);
content = content.replace(oldViewOrOpenPdf, newViewOrOpenPdf);
content = content.replace(oldGetSafePdfUrl, newGetSafePdfUrl);

// 4. Update chat message attachments rendering loop around line 27575
const oldChatAttachmentsLoop = `                    fileAttachments.forEach(a => {
                        const isDoc = a.isDoc || a.url?.startsWith('data:');
                        const meta = docFileIcon(a.type, a.name);
                        const bgClass = isMe
                            ? 'bg-white hover:bg-slate-50 border-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                        const textClass = isMe ? 'text-slate-800' : 'text-slate-800';
                        const subClass = isMe ? 'text-slate-400' : 'text-slate-400';
                        const sizeTxt = a.size ? \`\${(a.size / 1024).toFixed(0)} KB\` : '';

                        // Create download link with download attribute
                        attachmentHtml += \`
                        <div class="\${text ? 'mb-2' : ''} mt-1 group/attachment">
                            <div class="inline-flex items-center gap-2.5 p-2.5 \${bgClass} rounded-xl border cursor-pointer transition-colors"
                               style="text-decoration:none">
                                <iconify-icon icon="\${meta.icon}" width="22" style="color:\${meta.color};flex-shrink:0"></iconify-icon>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold \${textClass} truncate max-w-[160px]">\${escapeHtml(a.name || 'File')}</p>
                                    <p class="text-[9px] \${subClass}">\${meta.label}\${sizeTxt ? ' · ' + sizeTxt : ''}</p>
                                </div>
                                <div class="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                    <a href="\${getSafePdfUrl(a.url)}" target="_blank" rel="noopener noreferrer"
                                       class="flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity"
                                       title="Open file">
                                        <iconify-icon icon="solar:square-arrow-right-up-bold" width="14" class="\${isMe ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-600'}"></iconify-icon>
                                    </a>
                                    <a href="\${getSafePdfUrl(a.url)}" download="\${escapeHtml(a.name || 'file')}"
                                       class="flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity opacity-0 group-hover/attachment:opacity-100"
                                       title="Download file"
                                       onclick="event.stopPropagation()">
                                        <iconify-icon icon="solar:download-square-bold" width="14" class="\${isMe ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-600'}"></iconify-icon>
                                    </a>
                                </div>
                            </div>
                        </div>\`;
                    });`;

const newChatAttachmentsLoop = `                    fileAttachments.forEach(a => {
                        const isDoc = a.isDoc || a.url?.startsWith('data:');
                        const meta = docFileIcon(a.type, a.name);
                        const bgClass = isMe
                            ? 'bg-white hover:bg-slate-50 border-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200';
                        const textClass = isMe ? 'text-slate-800' : 'text-slate-800';
                        const subClass = isMe ? 'text-slate-400' : 'text-slate-400';
                        const sizeTxt = a.size ? \`\${(a.size / 1024).toFixed(0)} KB\` : '';
                        const safeUrl = (a.url || '').replace(/'/g, "\\\\'");
                        const safeName = (a.name || 'file.pdf').replace(/'/g, "\\\\'");

                        attachmentHtml += \`
                        <div class="\${text ? 'mb-2' : ''} mt-1 group/attachment">
                            <div class="inline-flex items-center gap-2.5 p-2.5 \${bgClass} rounded-xl border cursor-pointer transition-colors"
                               onclick="viewOrOpenPdf('\${safeUrl}', '\${safeName}')"
                               style="text-decoration:none">
                                <iconify-icon icon="\${meta.icon}" width="22" style="color:\${meta.color};flex-shrink:0"></iconify-icon>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold \${textClass} truncate max-w-[160px]">\${escapeHtml(a.name || 'File')}</p>
                                    <p class="text-[9px] \${subClass}">\${meta.label}\${sizeTxt ? ' · ' + sizeTxt : ''}</p>
                                </div>
                                <div class="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                    <button type="button" onclick="event.stopPropagation(); viewOrOpenPdf('\${safeUrl}', '\${safeName}')"
                                       class="flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity"
                                       title="Open file">
                                        <iconify-icon icon="solar:square-arrow-right-up-bold" width="14" class="\${isMe ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-600'}"></iconify-icon>
                                    </button>
                                    <button type="button" onclick="event.stopPropagation(); downloadFile('\${safeUrl}', '\${safeName}')"
                                       class="flex items-center justify-center h-5 w-5 rounded hover:opacity-70 transition-opacity opacity-0 group-hover/attachment:opacity-100"
                                       title="Download file">
                                        <iconify-icon icon="solar:download-square-bold" width="14" class="\${isMe ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-600'}"></iconify-icon>
                                    </button>
                                </div>
                            </div>
                        </div>\`;
                    });`;

content = content.replace(oldChatAttachmentsLoop, newChatAttachmentsLoop);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update script finished successfully.');
