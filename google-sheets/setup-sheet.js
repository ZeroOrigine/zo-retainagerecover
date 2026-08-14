/**
 * ZeroOrigine Master Workbook Setup Script
 *
 * INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1q8OqVwBD3utj7CtGayFjaNGbUkBKZL29vFF0qs9Zj4E/edit
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire file
 * 5. Click Run → setupAllTabs
 * 6. Authorize when prompted
 * 7. Check your Sheet — all headers and defaults will be set
 */

function setupAllTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupProjectsTab(ss);
  setupRevenueTab(ss);
  setupMindLogsTab(ss);
  setupIncidentLogTab(ss);
  setupConfigTab(ss);
  setupDomainsTab(ss);

  SpreadsheetApp.flush();
  Logger.log('All tabs set up successfully!');
}

function setupProjectsTab(ss) {
  let sheet = ss.getSheetByName('Projects');
  if (!sheet) sheet = ss.insertSheet('Projects');

  const headers = [
    'project_id', 'product_name', 'category', 'status', 'created_date',
    'human_approved', 'human_approved_at', 'build_started_at', 'build_completed_at',
    'build_failed_at', 'build_failed_step', 'build_error', 'rollback_completed_at',
    'qa_score', 'qa_passed_at', 'qa_rounds', 'preview_url', 'production_url',
    'github_repo', 'supabase_schema', 'stripe_product_id', 'netlify_site_id',
    'subdomain', 'research_idea_json', 'research_confidence', 'ethics_verdict',
    'ethics_notes', 'version'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupRevenueTab(ss) {
  let sheet = ss.getSheetByName('Revenue');
  if (!sheet) sheet = ss.insertSheet('Revenue');

  const headers = [
    'date', 'project_id', 'product_name', 'mrr_cad', 'active_users_7d',
    'signups_total', 'signups_month', 'paid_users', 'churn_rate',
    'ltv', 'cac', 'stripe_revenue_usd', 'exchange_rate', 'revenue_cad'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0f3460')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupMindLogsTab(ss) {
  let sheet = ss.getSheetByName('Mind Logs');
  if (!sheet) sheet = ss.insertSheet('Mind Logs');

  const headers = [
    'timestamp', 'workflow_name', 'mind_name', 'project_id', 'action',
    'input_tokens', 'output_tokens', 'cost_cad', 'duration_ms',
    'status', 'error_message', 'cache_hit'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#533483')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupIncidentLogTab(ss) {
  let sheet = ss.getSheetByName('Incident Log');
  if (!sheet) sheet = ss.insertSheet('Incident Log');

  const headers = [
    'incident_id', 'timestamp', 'severity', 'affected_products',
    'description', 'detected_by', 'status', 'resolved_at',
    'resolution_notes', 'root_cause', 'postmortem_link'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#e94560')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupConfigTab(ss) {
  let sheet = ss.getSheetByName('Config');
  if (!sheet) sheet = ss.insertSheet('Config');

  const headers = ['key', 'value', 'description', 'last_updated'];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#16213e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Seed default config values
  const defaults = [
    ['BUILD_LOCK', 'unlocked', 'Semaphore: only one build at a time', ''],
    ['BUILD_LOCK_TIMESTAMP', '', 'When lock was acquired', ''],
    ['BUILD_LOCK_PROJECT_ID', '', 'Which project holds the lock', ''],
    ['EXCLUDED_IDEAS', '[]', 'JSON array of rejected idea hashes', ''],
    ['RESEARCH_LEARNINGS', '', 'Accumulated learnings from retrospectives', ''],
    ['LAST_BACKUP', '', 'ISO-8601 of last Sheet backup', ''],
    ['BACKUP_COUNT', '0', 'Number of retained backups', ''],
    ['INTEGRITY_CHECK_LAST', '', 'Last integrity check timestamp', ''],
    ['INTEGRITY_CHECK_STATUS', '', 'PASS or FAIL', ''],
    ['EXCHANGE_RATE_USD_CAD', '1.36', 'Current USD-CAD exchange rate', ''],
    ['CURRENT_MONTHLY_SPEND', '0.00', 'AI + infra spend MTD (CAD)', ''],
    ['ECOSYSTEM_VERSION', '0.1.0', 'Current ecosystem version', ''],
  ];

  sheet.getRange(2, 1, defaults.length, 4).setValues(defaults);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupDomainsTab(ss) {
  let sheet = ss.getSheetByName('Domains');
  if (!sheet) sheet = ss.insertSheet('Domains');

  const headers = [
    'domain', 'status', 'type', 'project_id', 'registered_date',
    'expiry_date', 'cost_cad', 'registrar', 'dns_provider'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#0a1931')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Seed with known domain
  const domains = [
    ['zeroorigine.com', 'ACTIVE', 'PLATFORM', 'zo-platform', '2026-03-16', '2027-03-16', '15.00', 'GoDaddy', 'Cloudflare'],
  ];

  sheet.getRange(2, 1, domains.length, 9).setValues(domains);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}
