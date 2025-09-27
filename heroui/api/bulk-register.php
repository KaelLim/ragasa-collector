<?php
/**
 * 慈濟救災系統 - 大量註冊 API
 * 用於批量創建用戶並自動確認
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
$ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzQ4ODAwLCJleHAiOjE5MDgxMTUyMDB9.gAgVJVSC45QFHO7gqEirpCquw-3w1k6pqWpoOQRA-Qg';
$SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NTAzNDg4MDAsImV4cCI6MTkwODExNTIwMH0.OtlmhR0M9VRnIljImzpXuTX0VkHBsmRP28qqqF-UQKM';

try {
    // 解析 JSON 請求
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['users']) || !is_array($input['users'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Users array is required']);
        exit();
    }

    $users = $input['users'];
    $defaultPassword = '94800552';
    $results = [];
    $successCount = 0;
    $errorCount = 0;

    foreach ($users as $index => $userData) {
        $result = [
            'index' => $index,
            'email' => $userData['email'] ?? '',
            'name' => $userData['name'] ?? '',
            'success' => false,
            'message' => '',
            'user_id' => null
        ];

        try {
            // 驗證必要欄位
            if (empty($userData['email']) || empty($userData['name'])) {
                throw new Exception('Email and name are required');
            }

            // 1. 註冊用戶
            $signUpData = json_encode([
                'email' => $userData['email'],
                'password' => $defaultPassword,
                'data' => [
                    'full_name' => $userData['name']
                ]
            ]);

            $signUpContext = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => [
                        'Authorization: Bearer ' . $ANON_KEY,
                        'Content-Type: application/json',
                        'apikey: ' . $ANON_KEY
                    ],
                    'content' => $signUpData
                ]
            ]);

            $signUpUrl = $SUPABASE_URL . '/auth/v1/signup';
            $signUpResponse = file_get_contents($signUpUrl, false, $signUpContext);

            if ($signUpResponse === false) {
                throw new Exception('Failed to register user');
            }

            $signUpResult = json_decode($signUpResponse, true);

            if (isset($signUpResult['error'])) {
                if (strpos($signUpResult['error']['message'], 'already registered') !== false) {
                    $result['message'] = 'User already exists';
                } else {
                    throw new Exception($signUpResult['error']['message']);
                }
            } elseif (isset($signUpResult['user'])) {
                $userId = $signUpResult['user']['id'];
                $result['user_id'] = $userId;

                // 2. 自動確認用戶
                $updateData = json_encode(['email_confirm' => true]);
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

                $updateUrl = $SUPABASE_URL . '/auth/v1/admin/users/' . $userId;
                $updateResponse = file_get_contents($updateUrl, false, $updateContext);

                if ($updateResponse === false) {
                    $result['message'] = 'User created but auto-confirm failed';
                } else {
                    $result['success'] = true;
                    $result['message'] = 'User created and confirmed successfully';
                    $successCount++;
                }
            }

        } catch (Exception $e) {
            $result['message'] = $e->getMessage();
            $errorCount++;
        }

        $results[] = $result;
    }

    // 返回批量處理結果
    echo json_encode([
        'success' => true,
        'total' => count($users),
        'success_count' => $successCount,
        'error_count' => $errorCount,
        'results' => $results,
        'summary' => [
            'total_processed' => count($users),
            'successfully_created' => $successCount,
            'errors' => $errorCount,
            'default_password' => $defaultPassword
        ]
    ]);

} catch (Exception $e) {
    error_log('Bulk register error: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'details' => $e->getMessage()
    ]);
}
?>