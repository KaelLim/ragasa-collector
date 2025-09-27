<?php
/**
 * 慈濟救災系統 - 用戶確認 API
 * 用於 Supabase Community 版本的 auto confirm 功能
 */

// 設定 CORS 標頭
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// 處理 OPTIONS 請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 只接受 POST 請求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Supabase 配置
$SUPABASE_URL = 'https://sberelieffundpj.tzuchi-org.tw';
$SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTAzNDg4MDAsImV4cCI6MTkwODExNTIwMH0.OtlmhR0M9VRnIljImzpXuTX0VkHBsmRP28qqqF-UQKM';

try {
    // 解析 JSON 請求
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['email']) || empty($input['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        exit();
    }

    $email = $input['email'];

    // 1. 列出所有用戶以找到目標用戶
    $listUsersUrl = $SUPABASE_URL . '/auth/v1/admin/users';
    $listContext = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'Authorization: Bearer ' . $SERVICE_ROLE_KEY,
                'Content-Type: application/json',
                'apikey: ' . $SERVICE_ROLE_KEY
            ]
        ]
    ]);

    $listResponse = file_get_contents($listUsersUrl, false, $listContext);

    if ($listResponse === false) {
        throw new Exception('Failed to fetch users list');
    }

    $usersData = json_decode($listResponse, true);

    if (!isset($usersData['users'])) {
        throw new Exception('Invalid users response');
    }

    // 2. 找到目標用戶
    $targetUser = null;
    foreach ($usersData['users'] as $user) {
        if ($user['email'] === $email) {
            $targetUser = $user;
            break;
        }
    }

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }

    // 3. 確認用戶
    $updateUrl = $SUPABASE_URL . '/auth/v1/admin/users/' . $targetUser['id'];
    $updateData = json_encode([
        'email_confirm' => true
    ]);

    $updateContext = stream_context_create([
        'http' => [
            'method' => 'PUT',
            'header' => [
                'Authorization: Bearer ' . $SERVICE_ROLE_KEY,
                'Content-Type: application/json',
                'apikey: ' . $SERVICE_ROLE_KEY
            ],
            'content' => $updateData
        ]
    ]);

    $updateResponse = file_get_contents($updateUrl, false, $updateContext);

    if ($updateResponse === false) {
        throw new Exception('Failed to confirm user');
    }

    // 4. 返回成功結果
    echo json_encode([
        'success' => true,
        'message' => 'User confirmed successfully',
        'user_id' => $targetUser['id']
    ]);

} catch (Exception $e) {
    error_log('Confirm user error: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'details' => $e->getMessage()
    ]);
}
?>