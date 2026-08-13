const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace downloadFile
const downloadFileStart = 'async function downloadFile(url, fileName) {';
const downloadFileEnd = 'window.downloadFile = downloadFile;';

const newDownloadFileBlock = `async function downloadFile(url, fileName) {
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
            }
            window.downloadFile = downloadFile;`;

const idxDFStart = content.indexOf(downloadFileStart);
const idxDFEnd = content.indexOf(downloadFileEnd, idxDFStart) + downloadFileEnd.length;

if (idxDFStart !== -1 && idxDFEnd !== -1) {
    content = content.slice(0, idxDFStart) + newDownloadFileBlock + content.slice(idxDFEnd);
    console.log('Successfully replaced downloadFile!');
} else {
    console.error('Could not locate downloadFile block:', idxDFStart, idxDFEnd);
}

// 2. Replace viewOrOpenPdf
const viewPdfStart = 'async function viewOrOpenPdf(url, fileName) {';
const viewPdfEnd = 'window.viewOrOpenPdf = viewOrOpenPdf;';

const newViewPdfBlock = `async function viewOrOpenPdf(url, fileName) {
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
            }
            window.viewOrOpenPdf = viewOrOpenPdf;`;

const idxVPStart = content.indexOf(viewPdfStart);
const idxVPEnd = content.indexOf(viewPdfEnd, idxVPStart) + viewPdfEnd.length;

if (idxVPStart !== -1 && idxVPEnd !== -1) {
    content = content.slice(0, idxVPStart) + newViewPdfBlock + content.slice(idxVPEnd);
    console.log('Successfully replaced viewOrOpenPdf!');
} else {
    console.error('Could not locate viewOrOpenPdf block:', idxVPStart, idxVPEnd);
}

// 3. Replace getSafePdfUrl
const getSafePdfStart = 'function getSafePdfUrl(url, name) {';
const getSafePdfEnd = 'function openPdfUrl(url) {';

const newGetSafePdfBlock = `function getSafePdfUrl(url, name, forDownload = false) {
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
            }

            function openPdfUrl(url, name) {
                if (!url) return;
                if (typeof viewOrOpenPdf === 'function') {
                    viewOrOpenPdf(url, name);
                } else {
                    const safeUrl = getSafePdfUrl(url, name);
                    window.open(safeUrl, '_blank', 'noopener,noreferrer');
                }
            }`;

const idxGSStart = content.indexOf(getSafePdfStart);
const idxGSEnd = content.indexOf(getSafePdfEnd, idxGSStart) + getSafePdfEnd.length + '            function openPdfUrl(url) {\n                if (!url) return;\n                const safeUrl = getSafePdfUrl(url);\n                window.open(safeUrl, \'_blank\', \'noopener,noreferrer\');\n            }'.length;

const snippetGS = content.slice(idxGSStart, idxGSStart + 350);
console.log('GS snippet:', snippetGS);

const oldGSFull = `function getSafePdfUrl(url, name) {
                if (!url) return '';
                let strUrl = String(url);
                const isPdf = (name || strUrl).toLowerCase().includes('.pdf');
                if (isPdf && strUrl.includes('cloudinary.com') && strUrl.includes('/image/upload/')) {
                    const cleanName = encodeURIComponent(name || 'document.pdf');
                    return strUrl.replace('/image/upload/', \`/image/upload/fl_attachment:\${cleanName}/\`);
                }
                return strUrl;
            }

            function openPdfUrl(url) {
                if (!url) return;
                const safeUrl = getSafePdfUrl(url);
                window.open(safeUrl, '_blank', 'noopener,noreferrer');
            }`;

if (content.includes(oldGSFull)) {
    content = content.replace(oldGSFull, newGetSafePdfBlock);
    console.log('Successfully replaced getSafePdfUrl & openPdfUrl!');
} else {
    console.error('Could not locate oldGSFull string exact match');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Completed helpers update.');
