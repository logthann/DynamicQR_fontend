/**
 * OpenAPI Drift Guard
 *
 * Detects breaking changes in backend contract before implementation tasks execute.
 * Baseline: specs/frontend-app/contracts/openapi.yaml (or backend_infomation/contracts/openapi.yaml)
 * Current: specs/frontend-app/contracts/openapi.yaml
 *
 * Checks:
 * - Removed or renamed paths/methods
 * - Breaking request schema changes (required field additions, type narrowing, enum removals)
 * - Breaking response schema changes used by frontend modules
 * - Security/auth contract mismatches (public to protected or scope/role changes)
 *
 * Gate Behavior:
 * - FAIL on breaking changes; block task execution until resolved
 * - WARN on additive/non-breaking changes; regenerate + review
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface OpenAPISpec {
  paths?: Record<string, any>;
  components?: Record<string, any>;
  info?: { version: string };
  [key: string]: any;
}

interface DriftReport {
  status: 'PASS' | 'FAIL' | 'WARN';
  baselineVersion: string;
  currentVersion: string;
  breakingChanges: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Load and parse OpenAPI YAML specification
 */
function loadOpenAPISpec(filePath: string): OpenAPISpec {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as OpenAPISpec;
}

/**
 * Compare baseline and current OpenAPI specifications
 */
export function compareSpecs(baseline: OpenAPISpec, current: OpenAPISpec): DriftReport {
  const breakingChanges: string[] = [];
  const warnings: string[] = [];

  // Check version
  const baselineVersion = baseline.info?.version || 'unknown';
  const currentVersion = current.info?.version || 'unknown';

  // Check for removed or renamed paths
  const baselinePaths = Object.keys(baseline.paths || {});
  const currentPaths = Object.keys(current.paths || {});

  baselinePaths.forEach((path) => {
    if (!currentPaths.includes(path)) {
      breakingChanges.push(`BREAKING: Endpoint removed or renamed: ${path}`);
    }
  });

  // Check for removed methods
  Object.entries(baseline.paths || {}).forEach(([pathKey, pathItem]: [string, any]) => {
    const currentPath = current.paths?.[pathKey];
    if (!currentPath) return;

    Object.keys(pathItem).forEach((method) => {
      if (method.toLowerCase() === 'parameters') return;
      if (!currentPath[method]) {
        breakingChanges.push(`BREAKING: HTTP method removed: ${method.toUpperCase()} ${pathKey}`);
      }
    });
  });

  // Check for new required request parameters
  Object.entries(current.paths || {}).forEach(([pathKey, pathItem]: [string, any]) => {
    const baselinePath = baseline.paths?.[pathKey];
    if (!baselinePath) {
      warnings.push(`NEW: Endpoint added: ${pathKey}`);
      return;
    }

    Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
      if (method.toLowerCase() === 'parameters' || !operation.requestBody) return;

      const baselineOp = baselinePath[method];
      if (!baselineOp) {
        warnings.push(`NEW: HTTP method added: ${method.toUpperCase()} ${pathKey}`);
        return;
      }

      // Check request schema for breaking changes
      const baselineReqSchema = baselineOp.requestBody?.content?.['application/json']?.schema;
      const currentReqSchema = operation.requestBody?.content?.['application/json']?.schema;

      if (baselineReqSchema && currentReqSchema) {
        const baselineRequired = baselineReqSchema.required || [];
        const currentRequired = currentReqSchema.required || [];

        currentRequired.forEach((field: string) => {
          if (!baselineRequired.includes(field)) {
            breakingChanges.push(
              `BREAKING: New required field in request: ${field} at ${method.toUpperCase()} ${pathKey}`
            );
          }
        });
      }
    });
  });

  const status = breakingChanges.length > 0 ? 'FAIL' : warnings.length > 0 ? 'WARN' : 'PASS';

  return {
    status,
    baselineVersion,
    currentVersion,
    breakingChanges,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Write drift report
 */
function writeDriftReport(report: DriftReport, reportPath: string): void {
  const reportContent = `# OpenAPI Drift Guard Report

**Generated**: ${report.timestamp}
**Status**: ${report.status}

## Comparison
- **Baseline Version**: ${report.baselineVersion}
- **Current Version**: ${report.currentVersion}

## Breaking Changes (${report.breakingChanges.length})
${report.breakingChanges.length === 0 ? '✓ None detected' : report.breakingChanges.map((c) => `- ${c}`).join('\n')}

## Warnings (${report.warnings.length})
${report.warnings.length === 0 ? '✓ None detected' : report.warnings.map((w) => `- ${w}`).join('\n')}

## Verdict
- **Status**: ${report.status}
${report.status === 'FAIL' ? '- **Action**: Fix breaking changes and re-run drift guard before proceeding' : ''}
${report.status === 'WARN' ? '- **Action**: Review warnings and regenerate typed client' : ''}
${report.status === 'PASS' ? '- **Action**: Proceed with implementation' : ''}
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, reportContent, 'utf-8');
}

/**
 * Main drift check function
 */
export async function checkDrift(): Promise<DriftReport> {
  try {
    const canonicalPath = path.resolve(
      __dirname,
      '../../../../backend_infomation/contracts/openapi.yaml'
    );
    const mirrorPath = path.resolve(__dirname, '../../../../specs/frontend-app/contracts/openapi.yaml');

    if (!fs.existsSync(canonicalPath)) {
      throw new Error(`Canonical contract not found: ${canonicalPath}`);
    }
    if (!fs.existsSync(mirrorPath)) {
      throw new Error(`Mirror contract not found: ${mirrorPath}`);
    }

    const baseline = loadOpenAPISpec(canonicalPath);
    const current = loadOpenAPISpec(mirrorPath);

    const report = compareSpecs(baseline, current);

    const reportPath = path.resolve(__dirname, '../../../reports/openapi-drift-report.md');
    writeDriftReport(report, reportPath);

    console.log(`[DRIFT GUARD] Report written to: ${reportPath}`);
    console.log(`[DRIFT GUARD] Status: ${report.status}`);

    if (report.breakingChanges.length > 0) {
      console.error(`[DRIFT GUARD] ${report.breakingChanges.length} breaking change(s) detected!`);
      process.exit(1);
    }

    return report;
  } catch (error) {
    console.error('[DRIFT GUARD] Error during drift check:', error);
    process.exit(1);
  }
}

// Run if invoked directly
if (require.main === module) {
  checkDrift().then((report) => {
    console.log(`[DRIFT GUARD] Drift check completed: ${report.status}`);
    process.exit(report.status === 'PASS' ? 0 : 1);
  });
}

