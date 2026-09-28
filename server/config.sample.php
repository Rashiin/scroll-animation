<?php
// Copy to config.php and edit. config.php is git-ignored.
return [
    'allowed_origins' => ['https://spacecabin.example', 'http://localhost:4321'],
    'notify_email'    => 'sales@mammut.example',
    'from_email'      => 'no-reply@spacecabin.example',
    'sqlite_path'     => __DIR__ . '/data/leads.sqlite',
    'csv_path'        => __DIR__ . '/data/leads.csv',
    'webhook_url'     => '',   // e.g. your CRM / Zapier / n8n / Make endpoint
    'webhook_secret'  => '',
    'min_fill_ms'     => 3000,
    'max_per_hour'    => 5,
];
