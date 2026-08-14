/**
 * ZeroOrigine — Setup Daily Summary Tab + Config Additions
 * Run this once in Google Apps Script to create:
 * 1. "Daily Summary" tab (Tab 9) for WF-09 Daily Founder Briefing
 * 2. Additional Config rows for budget, infrastructure costs, credential expiry
 *
 * Instructions:
 * 1. Open ZO-Master-Workbook in Google Sheets
 * 2. Extensions > Apps Script
 * 3. Paste this script and run setupDailySummaryAndConfig()
 */

function setupDailySummaryAndConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createDailySummaryTab(ss);
  addConfigEntries(ss);

  SpreadsheetApp.flush();
  Logger.log('Daily Summary tab and Config entries created successfully.');
}

function createDailySummaryTab(ss) {
  // Check if tab already exists
  let sheet = ss.getSheetByName('Daily Summary');
  if (sheet) {
    Logger.log('Daily Summary tab already exists. Skipping creation.');
    return;
  }

  sheet = ss.insertSheet('Daily Summary');

  // Headers
  const headers = [
    'date',
    'total_executions',
    'total_cost_cad',
    'minds_active',
    'errors_count',
    'incidents_open',
    'incidents_new',
    'products_building',
    'products_qa',
    'products_live',
    'revenue_today_cad',
    'revenue_mtd_cad',
    'budget_used_pct',
    'stalled_count',
    'predictive_alerts',
    'briefing_sent',
    'seven_minutes_actions'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#e2e8f0');

  // Freeze header row
  sheet.setFrozenRows(1);

  // Set column widths
  sheet.setColumnWidth(1, 110);  // date
  sheet.setColumnWidth(2, 130);  // total_executions
  sheet.setColumnWidth(3, 120);  // total_cost_cad
  sheet.setColumnWidth(4, 110);  // minds_active
  sheet.setColumnWidth(5, 110);  // errors_count
  sheet.setColumnWidth(6, 120);  // incidents_open
  sheet.setColumnWidth(7, 110);  // incidents_new
  sheet.setColumnWidth(8, 140);  // products_building
  sheet.setColumnWidth(9, 110);  // products_qa
  sheet.setColumnWidth(10, 110); // products_live
  sheet.setColumnWidth(11, 140); // revenue_today_cad
  sheet.setColumnWidth(12, 130); // revenue_mtd_cad
  sheet.setColumnWidth(13, 130); // budget_used_pct
  sheet.setColumnWidth(14, 120); // stalled_count
  sheet.setColumnWidth(15, 300); // predictive_alerts (JSON)
  sheet.setColumnWidth(16, 110); // briefing_sent
  sheet.setColumnWidth(17, 300); // seven_minutes_actions (JSON)

  // Format columns
  sheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('C2:C').setNumberFormat('$#,##0.00');
  sheet.getRange('K2:L').setNumberFormat('$#,##0.00');
  sheet.getRange('M2:M').setNumberFormat('0.0%');

  // Conditional formatting for budget_used_pct
  const budgetRange = sheet.getRange('M2:M1000');
  const rules = sheet.getConditionalFormatRules();

  // Red if > 100%
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(1.0)
    .setBackground('#f8d7da')
    .setRanges([budgetRange])
    .build());

  // Yellow if > 80%
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(0.8, 1.0)
    .setBackground('#fff3cd')
    .setRanges([budgetRange])
    .build());

  // Green if <= 80%
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(0.8)
    .setBackground('#d4edda')
    .setRanges([budgetRange])
    .build());

  sheet.setConditionalFormatRules(rules);

  // Create named range
  ss.setNamedRange('DailySummaryData', sheet.getRange('A2:Q'));

  Logger.log('Daily Summary tab created with headers, formatting, and named range.');
}

function addConfigEntries(ss) {
  const configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    Logger.log('ERROR: Config tab not found.');
    return;
  }

  // Read existing keys to avoid duplicates
  const existingData = configSheet.getDataRange().getValues();
  const existingKeys = existingData.map(row => row[0]);

  const newEntries = [
    ['MONTHLY_BUDGET_CEILING_CAD', '704'],
    ['MONTHLY_INFRA_FIXED_COST_CAD', '89'],
    ['DAILY_BRIEFING_ENABLED', 'true'],
    ['STRIPE_FEE_PCT', '2.9'],
    ['STRIPE_FEE_FIXED_CAD', '0.41'],
    ['CREDENTIAL_EXPIRY_CLAUDE', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_STRIPE', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_RESEND', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_GOOGLE_OAUTH', '2026-09-20'],
    ['CREDENTIAL_EXPIRY_GITHUB', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_SUPABASE', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_NETLIFY', '2027-03-20'],
    ['CREDENTIAL_EXPIRY_CLOUDFLARE', '2027-03-20']
  ];

  let addedCount = 0;
  for (const [key, value] of newEntries) {
    if (!existingKeys.includes(key)) {
      const nextRow = configSheet.getLastRow() + 1;
      configSheet.getRange(nextRow, 1, 1, 2).setValues([[key, value]]);
      addedCount++;
    }
  }

  Logger.log(`Added ${addedCount} new Config entries (skipped ${newEntries.length - addedCount} existing).`);
}
