<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function send_json(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function clean_value(?string $value): string {
    if ($value === null) {
        return '';
    }
    $trimmed = trim($value);
    if ((str_starts_with($trimmed, '"') && str_ends_with($trimmed, '"')) ||
        (str_starts_with($trimmed, "'") && str_ends_with($trimmed, "'"))) {
        return trim(substr($trimmed, 1, -1));
    }
    return $trimmed;
}

function normalize_soap_value(mixed $value): mixed {
    if (is_array($value)) {
        $normalized = [];
        foreach ($value as $key => $item) {
            $normalized[$key] = normalize_soap_value($item);
        }
        return $normalized;
    }

    if (!is_object($value)) {
        return $value;
    }

    $obj = get_object_vars($value);

    if (array_key_exists('$value', $obj) && count(array_diff(array_keys($obj), ['$value', 'attributes'])) === 0) {
        return normalize_soap_value($obj['$value']);
    }

    if (array_key_exists('return', $obj) && count($obj) <= 2) {
        return normalize_soap_value($obj['return']);
    }

    $normalized = [];
    foreach ($obj as $key => $item) {
        if ($key === 'attributes') {
            continue;
        }
        $normalized[$key] = normalize_soap_value($item);
    }
    return $normalized;
}

function get_headers_map(): array {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            return $headers;
        }
    }

    $headers = [];
    foreach ($_SERVER as $name => $value) {
        if (str_starts_with($name, 'HTTP_')) {
            $header = str_replace('_', '-', substr($name, 5));
            $headers[$header] = $value;
        }
    }
    return $headers;
}

function bearer_token(): string {
    $headers = get_headers_map();
    foreach ($headers as $name => $value) {
        if (strtolower($name) === 'authorization' && preg_match('/^Bearer\s+(.+)$/i', $value, $m)) {
            return trim($m[1]);
        }
    }
    return '';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(405, ['ok' => false, 'errorMessage' => 'Method not allowed']);
}

$configPath = __DIR__ . '/config.php';
if (!file_exists($configPath)) {
    send_json(500, ['ok' => false, 'errorMessage' => 'Missing config.php (copy from config.example.php)']);
}

$config = require $configPath;
if (!is_array($config)) {
    send_json(500, ['ok' => false, 'errorMessage' => 'Invalid config.php']);
}

$bridgeToken = clean_value((string)($config['bridge_token'] ?? ''));
if ($bridgeToken === '') {
    send_json(500, ['ok' => false, 'errorMessage' => 'Bridge token is empty']);
}

if (!hash_equals($bridgeToken, bearer_token())) {
    send_json(401, ['ok' => false, 'errorMessage' => 'Unauthorized']);
}

if (!extension_loaded('soap')) {
    send_json(500, ['ok' => false, 'errorMessage' => 'PHP SOAP extension is not enabled']);
}

$body = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($body)) {
    send_json(400, ['ok' => false, 'errorMessage' => 'Invalid JSON payload']);
}

$action = (string)($body['action'] ?? '');
$payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];

$actionMap = [
    'listDomains' => 'listDomains',
    'domainInfo' => 'domainInfo',
    'listDNSZone' => 'listDNSZone',
    'addDNSRecord' => 'addDNSRecord',
    'deleteDNSRecord' => 'deleteDNSRecord',
    'renewDomain' => 'renewDomain',
    'checkDomain' => 'checkDomain',
];

if (!array_key_exists($action, $actionMap)) {
    send_json(400, ['ok' => false, 'errorMessage' => 'Unsupported action']);
}

$resellerId = clean_value((string)($config['sw_reseller_id'] ?? ''));
$apiKey = clean_value((string)($config['sw_api_key'] ?? ''));
if ($resellerId === '' || $apiKey === '') {
    send_json(500, ['ok' => false, 'errorMessage' => 'Missing Synergy credentials in config.php']);
}

$request = array_merge([
    'resellerID' => $resellerId,
    'apiKey' => $apiKey,
], $payload);

if ($action === 'listDomains') {
    $request['page'] = isset($request['page']) ? max(1, (int)$request['page']) : 1;
    $request['limit'] = isset($request['limit']) ? max(1, min(500, (int)$request['limit'])) : 500;
}

try {
    $client = new SoapClient('https://api.synergywholesale.com/?wsdl', [
        'trace' => false,
        'exceptions' => true,
        'cache_wsdl' => WSDL_CACHE_BOTH,
        'connection_timeout' => 30,
    ]);

    $soapMethod = $actionMap[$action];
    $raw = $client->{$soapMethod}($request);
    $data = normalize_soap_value($raw);

    if (!is_array($data)) {
        send_json(502, ['ok' => false, 'errorMessage' => 'Unexpected SOAP response shape']);
    }

    $status = isset($data['status']) ? (string)$data['status'] : null;
    $errorMessage = isset($data['errorMessage']) ? (string)$data['errorMessage'] : null;

    $ok = !is_string($status) || !str_starts_with(strtoupper($status), 'ERR');

    send_json(200, [
        'ok' => $ok,
        'status' => $status,
        'errorMessage' => $errorMessage,
        'data' => $data,
    ]);
} catch (Throwable $e) {
    send_json(502, [
        'ok' => false,
        'errorMessage' => 'Bridge SOAP request failed',
        'detail' => $e->getMessage(),
    ]);
}
