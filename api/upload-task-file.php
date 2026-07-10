<?php
// upload-task-file.php - Handle task file uploads on Hostinger
// Upload endpoint for task attachments (images, videos, documents)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST allowed']);
    exit;
}

// Configuration
$MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
$UPLOAD_DIR = __DIR__ . '/../uploads/task-attachments/';
$ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
];

// Create upload directory if it doesn't exist
if (!is_dir($UPLOAD_DIR)) {
    if (!mkdir($UPLOAD_DIR, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
        exit;
    }
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $error_codes = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
        UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
    ];
    $error_code = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    echo json_encode([
        'success' => false,
        'error' => 'Upload error: ' . ($error_codes[$error_code] ?? 'Unknown error'),
        'code' => $error_code
    ]);
    exit;
}

$file = $_FILES['file'];

// Validate file size
if ($file['size'] > $MAX_FILE_SIZE) {
    http_response_code(413);
    echo json_encode([
        'success' => false,
        'error' => 'File too large',
        'max_size_mb' => 100,
        'file_size_mb' => round($file['size'] / 1024 / 1024, 2)
    ]);
    exit;
}

// Validate file type by MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$real_mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($real_mime, $ALLOWED_TYPES)) {
    http_response_code(415);
    echo json_encode([
        'success' => false,
        'error' => 'File type not allowed',
        'mime_type' => $real_mime,
        'allowed_types' => $ALLOWED_TYPES
    ]);
    exit;
}

// Generate safe filename with timestamp
$original_name = basename($file['name']);
$file_ext = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));
$safe_name = 'task_' . time() . '_' . rand(10000, 99999) . '.' . $file_ext;
$file_path = $UPLOAD_DIR . $safe_name;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $file_path)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to save file to disk'
    ]);
    exit;
}

// Set proper permissions
chmod($file_path, 0644);

// Get protocol and host
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$file_url = $protocol . '://' . $host . '/uploads/task-attachments/' . $safe_name;

// Success response
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'File uploaded successfully',
    'file_url' => $file_url,
    'file_name' => $original_name,
    'file_size' => $file['size'],
    'uploaded_at' => date('Y-m-d H:i:s'),
    'mime_type' => $real_mime
]);
?>
