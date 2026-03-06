#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

const toKiB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

const budgets = {
  maxJsChunkBytes: Number(process.env.BUDGET_MAX_JS_CHUNK_BYTES || 180 * 1024),
  maxCssChunkBytes: Number(process.env.BUDGET_MAX_CSS_CHUNK_BYTES || 150 * 1024),
  maxTotalJsBytes: Number(process.env.BUDGET_MAX_TOTAL_JS_BYTES || 1600 * 1024),
  maxTotalCssBytes: Number(process.env.BUDGET_MAX_TOTAL_CSS_BYTES || 220 * 1024),
  maxAssetFiles: Number(process.env.BUDGET_MAX_ASSET_FILES || 80),
};

if (!fs.existsSync(DIST_DIR) || !fs.existsSync(ASSETS_DIR)) {
  console.error('[bundle-budget] Missing dist/assets. Run `npm run build` first.');
  process.exit(1);
}

const assetFiles = fs.readdirSync(ASSETS_DIR);
const primaryAssetFiles = assetFiles.filter(
  (file) => !file.endsWith('.br') && !file.endsWith('.gz') && !file.endsWith('.map')
);
const jsFiles = assetFiles.filter((file) => file.endsWith('.js'));
const cssFiles = assetFiles.filter((file) => file.endsWith('.css'));

const fileInfo = (file) => {
  const fullPath = path.join(ASSETS_DIR, file);
  const size = fs.statSync(fullPath).size;
  return { file, size };
};

const jsInfo = jsFiles.map(fileInfo).sort((a, b) => b.size - a.size);
const cssInfo = cssFiles.map(fileInfo).sort((a, b) => b.size - a.size);

const totalJsBytes = jsInfo.reduce((sum, item) => sum + item.size, 0);
const totalCssBytes = cssInfo.reduce((sum, item) => sum + item.size, 0);

const checks = [
  {
    label: 'max JS chunk',
    actual: jsInfo[0]?.size || 0,
    limit: budgets.maxJsChunkBytes,
    meta: jsInfo[0]?.file || 'n/a',
  },
  {
    label: 'max CSS chunk',
    actual: cssInfo[0]?.size || 0,
    limit: budgets.maxCssChunkBytes,
    meta: cssInfo[0]?.file || 'n/a',
  },
  {
    label: 'total JS',
    actual: totalJsBytes,
    limit: budgets.maxTotalJsBytes,
    meta: `${jsInfo.length} files`,
  },
  {
    label: 'total CSS',
    actual: totalCssBytes,
    limit: budgets.maxTotalCssBytes,
    meta: `${cssInfo.length} files`,
  },
  {
    label: 'primary asset file count',
    actual: primaryAssetFiles.length,
    limit: budgets.maxAssetFiles,
    meta: 'dist/assets',
  },
];

const failures = checks.filter((check) => check.actual > check.limit);

console.log('[bundle-budget] Summary');
checks.forEach((check) => {
  const status = check.actual > check.limit ? 'FAIL' : 'OK';
  const value =
    check.label === 'primary asset file count'
      ? `${check.actual}`
      : `${toKiB(check.actual)} (${check.actual} B)`;
  const limit =
    check.label === 'primary asset file count'
      ? `${check.limit}`
      : `${toKiB(check.limit)} (${check.limit} B)`;
  console.log(`- ${status} ${check.label}: ${value} <= ${limit} [${check.meta}]`);
});

if (failures.length) {
  console.error('[bundle-budget] Budget check failed.');
  process.exit(1);
}

console.log('[bundle-budget] Budget check passed.');
