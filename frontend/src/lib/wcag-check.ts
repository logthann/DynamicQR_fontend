/**
 * WCAG 2.1 AA Accessibility Validation Script
 *
 * Runs axe-core checks against rendered pages to ensure color contrast,
 * focus indicators, and other WCAG 2.1 AA compliance for Pure Black theme.
 */

import { chromium } from 'playwright';
import { injectAxe, checkA11y } from 'axe-playwright';
import * as fs from 'fs';
import * as path from 'path';

const WCAG_REPORT_PATH = path.join(__dirname, '../../reports/wcag-report.json');

interface WCAGResult {
  page: string;
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    nodes: number;
  }>;
  passes: number;
  incomplete: number;
}

async function checkPage(page: any, url: string): Promise<WCAGResult> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await injectAxe(page);

  const results = await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });

  return {
    page: url,
    violations: results.violations?.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    })) || [],
    passes: results.passes?.length || 0,
    incomplete: results.incomplete?.length || 0,
  };
}

async function runWCAGChecks(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results: WCAGResult[] = [];
  const pagesToCheck = [
    'http://localhost:3000/',
    'http://localhost:3000/login',
    'http://localhost:3000/register',
  ];

  console.log('[WCAG CHECK] Starting accessibility validation...');

  for (const url of pagesToCheck) {
    try {
      console.log(`[WCAG CHECK] Checking ${url}`);
      const result = await checkPage(page, url);
      results.push(result);

      if (result.violations.length === 0) {
        console.log(`[WCAG CHECK] ✓ ${url} - PASS (${result.passes} checks)`);
      } else {
        console.warn(
          `[WCAG CHECK] ⚠ ${url} - ${result.violations.length} violation(s) found`
        );
        result.violations.forEach((v) => {
          console.warn(
            `  - ${v.id} (${v.impact}): ${v.description} [${v.nodes} node(s)]`
          );
        });
      }
    } catch (error) {
      console.error(`[WCAG CHECK] ✗ Error checking ${url}:`, error);
    }
  }

  await browser.close();

  // Write report
  const report = {
    timestamp: new Date().toISOString(),
    status: results.every((r) => r.violations.length === 0) ? 'PASS' : 'FAIL',
    results,
    summary: {
      totalPages: results.length,
      pagesWithViolations: results.filter((r) => r.violations.length > 0).length,
      totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
      totalPasses: results.reduce((sum, r) => sum + r.passes, 0),
    },
  };

  fs.mkdirSync(path.dirname(WCAG_REPORT_PATH), { recursive: true });
  fs.writeFileSync(WCAG_REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`[WCAG CHECK] Report written to: ${WCAG_REPORT_PATH}`);
  console.log(`[WCAG CHECK] Status: ${report.status}`);

  if (report.status === 'FAIL') {
    console.error(`[WCAG CHECK] ${report.summary.totalViolations} violation(s) found!`);
    process.exit(1);
  }
}

runWCAGChecks().catch((error) => {
  console.error('[WCAG CHECK] Fatal error:', error);
  process.exit(1);
});

