/**
 * ZeroOrigine — Setup Continuous-Flow Config + Projects Columns
 * Run this once in Google Apps Script to add:
 * 1. Config entries for budget gates, auto-approve thresholds, tier ceilings
 * 2. New columns to Projects tab for cost estimation, tier classification, CFO reporting
 *
 * Instructions:
 * 1. Open ZO-Master-Workbook in Google Sheets
 * 2. Extensions > Apps Script
 * 3. Paste this script and run setupContinuousFlow()
 *
 * Authority: Freedom Model (Article I) + Financial Discipline (Article X)
 * CFO Mind owns all financial parameters below.
 */

function setupContinuousFlow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  addContinuousFlowConfig(ss);
  addProjectsColumns(ss);

  SpreadsheetApp.flush();
  Logger.log('Continuous-flow Config entries and Projects columns created successfully.');
}

function addContinuousFlowConfig(ss) {
  const configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    Logger.log('ERROR: Config tab not found.');
    return;
  }

  const existingData = configSheet.getDataRange().getValues();
  const existingKeys = existingData.map(row => row[0]);

  const newEntries = [
    // Budget gate parameters (CFO Mind authority)
    ['MONTHLY_VARIABLE_BUDGET_CAD', '587.39'],
    ['MONTHLY_FIXED_COST_CAD', '116.61'],
    ['CURRENT_VARIABLE_SPEND_MTD', '0.00'],
    ['BUDGET_GATE_STATUS', 'OPEN'],

    // Product tier cost ceilings (variable cost only — fixed costs are sunk)
    ['TIER1_COST_CEILING_CAD', '1.00'],
    ['TIER2_COST_CEILING_CAD', '10.00'],
    ['TIER3_COST_CEILING_CAD', '50.00'],

    // Auto-approve thresholds
    ['AUTO_APPROVE_MIN_REVENUE_CONFIDENCE', '6'],
    ['AUTO_APPROVE_MIN_ETHICS_SCORE', '8.5'],

    // QA mode for Tier 1 (LITE = smoke test ~$0.05, FULL = comprehensive ~$1.50)
    ['TIER1_QA_MODE', 'LITE'],

    // FX rate for USD→CAD conversion (update monthly from Bank of Canada)
    ['USD_TO_CAD_RATE', '1.36'],

    // Token cost rates (CAD) for cost accumulator nodes
    ['SONNET_INPUT_COST_PER_1K_CAD', '0.00408'],
    ['SONNET_OUTPUT_COST_PER_1K_CAD', '0.02040'],
    ['HAIKU_INPUT_COST_PER_1K_CAD', '0.00109'],
    ['HAIKU_OUTPUT_COST_PER_1K_CAD', '0.00544'],

    // Monthly spend reset day (1 = first of month)
    ['BUDGET_RESET_DAY', '1'],
  ];

  let addedCount = 0;
  for (const [key, value] of newEntries) {
    if (!existingKeys.includes(key)) {
      const nextRow = configSheet.getLastRow() + 1;
      configSheet.getRange(nextRow, 1, 1, 2).setValues([[key, value]]);
      addedCount++;
    }
  }

  // Update MONTHLY_INFRA_FIXED_COST_CAD from 89 to 116.61 if it exists
  const infraRow = existingKeys.indexOf('MONTHLY_INFRA_FIXED_COST_CAD');
  if (infraRow > -1) {
    configSheet.getRange(infraRow + 1, 2).setValue('116.61');
    Logger.log('Updated MONTHLY_INFRA_FIXED_COST_CAD from 89 to 116.61');
  }

  Logger.log(`Added ${addedCount} new Config entries (skipped ${newEntries.length - addedCount} existing).`);
}

function addProjectsColumns(ss) {
  const projectsSheet = ss.getSheetByName('Projects');
  if (!projectsSheet) {
    Logger.log('ERROR: Projects tab not found.');
    return;
  }

  const headers = projectsSheet.getRange(1, 1, 1, projectsSheet.getLastColumn()).getValues()[0];

  const newColumns = [
    'product_tier',
    'estimated_build_cost_cad',
    'estimated_monthly_cost_cad',
    'revenue_confidence',
    'approval_method',
    'cfo_go_nogo',
    'cfo_report_json',
    'actual_build_cost_cad',
    'break_even_mrr_cad'
  ];

  let addedCount = 0;
  for (const col of newColumns) {
    if (!headers.includes(col)) {
      const nextCol = projectsSheet.getLastColumn() + 1;
      projectsSheet.getRange(1, nextCol).setValue(col).setFontWeight('bold');
      addedCount++;
    }
  }

  Logger.log(`Added ${addedCount} new Projects columns (skipped ${newColumns.length - addedCount} existing).`);
}
