/**
 * ZeroOrigine — Governance Log + Canary Metrics Tabs
 *
 * INSTRUCTIONS:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1q8OqVwBD3utj7CtGayFjaNGbUkBKZL29vFF0qs9Zj4E/edit
 * 2. Go to Extensions → Apps Script
 * 3. Paste this code (below existing code is fine)
 * 4. Click Run → setupGovernanceTabs
 * 5. Authorize if prompted
 */

function setupGovernanceTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupGovernanceLogTab(ss);
  setupCanaryMetricsTab(ss);

  SpreadsheetApp.flush();
  Logger.log('Governance Log + Canary Metrics tabs created successfully!');
}

function setupGovernanceLogTab(ss) {
  let sheet = ss.getSheetByName('Governance Log');
  if (!sheet) sheet = ss.insertSheet('Governance Log');

  const headers = [
    'decision_id',        // GOV-YYYYMMDD-NNN
    'date',               // ISO date
    'tier',               // 1, 2, or 3
    'decision_type',      // e.g., "Bug fix deployment", "New product launch"
    'description',        // What was decided
    'maker_mind',         // Mind that proposed/made the decision
    'checker_mind',       // Mind that reviewed (Tier 2+)
    'committee_members',  // Committee members (Tier 3 only)
    'founder_approved',   // TRUE/FALSE (Tier 3 only)
    'outcome',            // APPROVED / REJECTED / ESCALATED
    'reasoning',          // Why this decision was made
    'constitution_ref',   // Which Constitution article applies
    'ethics_verdict',     // PASS / CONDITIONAL / FAIL
    'cfo_verdict',        // APPROVED / FLAGGED / VETOED
    'escalated_from',     // If escalated, original tier
    'related_project_id', // zo-YYMMDD-xxx-xxxx if applicable
    'notes'               // Additional context
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
}

function setupCanaryMetricsTab(ss) {
  let sheet = ss.getSheetByName('Canary Metrics');
  if (!sheet) sheet = ss.insertSheet('Canary Metrics');

  const headers = [
    'report_date',        // Monthly report date (1st of month)
    'cm1_ethics_override_pct',  // CM-1: Ethics override rate (healthy: <5%)
    'cm1_status',               // GREEN / YELLOW / RED
    'cm2_free_tier_genuine',    // CM-2: Free tier genuine score (healthy: >7/10)
    'cm2_status',
    'cm3_data_collection_drift',// CM-3: Data fields vs launch baseline (healthy: 0% growth)
    'cm3_status',
    'cm4_unsubscribe_friction', // CM-4: Unsubscribe click count (healthy: ≤2)
    'cm4_status',
    'cm5_revenue_per_user',     // CM-5: Revenue per user trend (healthy: stable or declining)
    'cm5_status',
    'cm6_auto_action_ratio',    // CM-6: Auto vs confirmed actions (healthy: 0 unauthorized)
    'cm6_status',
    'cm7_budget_variance_pct',  // CM-7: Actual vs budgeted spend (healthy: <10%)
    'cm7_status',
    'overall_health',           // GREEN / YELLOW / RED (worst of all)
    'report_by',                // Which Mind generated this report
    'founder_reviewed',         // TRUE/FALSE
    'notes'                     // Actions taken or observations
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));

  // Add first row as baseline template
  const baselineRow = [
    '2026-03-20',  // report_date
    '0%',          // cm1 - no overrides yet
    'GREEN',       // cm1 status
    'N/A',         // cm2 - no products with free tier yet
    'GREEN',       // cm2 status
    '0%',          // cm3 - baseline
    'GREEN',       // cm3 status
    'N/A',         // cm4 - no subscriptions yet
    'GREEN',       // cm4 status
    '$0',          // cm5 - no revenue yet
    'GREEN',       // cm5 status
    '0',           // cm6 - no auto actions
    'GREEN',       // cm6 status
    '0%',          // cm7 - baseline month
    'GREEN',       // cm7 status
    'GREEN',       // overall
    'CFO Mind',    // report_by
    'FALSE',       // founder_reviewed
    'Baseline report — ecosystem launch month. All metrics at zero/healthy state.'
  ];

  sheet.getRange(2, 1, 1, baselineRow.length).setValues([baselineRow]);
}
