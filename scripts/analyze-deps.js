#!/usr/bin/env node
/**
 * Module Dependency Analyzer
 * 
 * Analyzes cross-module dependencies and detects architectural violations
 * in the modular monolith architecture.
 * 
 * Usage: node scripts/analyze-deps.js
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = resolve(__dirname, '../apps/api/src/modules');

// Colors for terminal output
const C = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Layer ordering (lower = deeper/core)
const LAYERS = {
  'domain': 0,
  'repo': 1,
  'service': 2,
  'api': 3,
  'worker': 2  // Workers are at service level
};

// Parse an import statement to extract the module and layer
function parseImportPath(importPath, currentFile) {
  // Handle relative imports from modules
  const moduleMatch = importPath.match(/\.\.\/\.\.\/(\w+)\/(\w+)\/(.+)/);
  if (moduleMatch) {
    return {
      targetModule: moduleMatch[1],
      targetLayer: moduleMatch[2],
      targetFile: moduleMatch[3],
      isCrossModule: true
    };
  }
  
  // Handle same-module imports (../layer/file)
  const sameModuleMatch = importPath.match(/\.\.\/(\w+)\/(.+)/);
  if (sameModuleMatch && !importPath.startsWith('../../..')) {
    const currentModule = extractModuleFromPath(currentFile);
    return {
      targetModule: currentModule,
      targetLayer: sameModuleMatch[1],
      targetFile: sameModuleMatch[2],
      isCrossModule: false
    };
  }
  
  return null;
}

function extractModuleFromPath(filePath) {
  const match = filePath.match(/modules\/(\w+)/);
  return match ? match[1] : null;
}

function extractLayerFromPath(filePath) {
  const match = filePath.match(/modules\/\w+\/(\w+)/);
  return match ? match[1] : null;
}

function findAllTSFiles(dir, files = []) {
  try {
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        findAllTSFiles(fullPath, files);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory might not exist
  }
  return files;
}

function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const currentModule = extractModuleFromPath(filePath);
  const currentLayer = extractLayerFromPath(filePath);
  
  const imports = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const parsed = parseImportPath(importPath, filePath);
    
    if (parsed) {
      imports.push({
        raw: importPath,
        ...parsed,
        sourceModule: currentModule,
        sourceLayer: currentLayer,
        sourceFile: relative(MODULES_DIR, filePath)
      });
    }
  }
  
  return imports;
}

function analyzeViolations(imports) {
  const violations = [];
  
  for (const imp of imports) {
    // Check 1: Service layer importing from another module's repo directly
    // This creates tight coupling - should go through service layer
    if (imp.sourceLayer === 'service' && 
        imp.isCrossModule && 
        imp.targetLayer === 'repo') {
      violations.push({
        type: 'CROSS_MODULE_REPO_IMPORT',
        severity: 'warning',
        message: `${imp.sourceModule}/service imports ${imp.targetModule}/repo/${imp.targetFile}`,
        suggestion: `Consider using ${imp.targetModule}/service instead`,
        ...imp
      });
    }
    
    // Check 2: Domain layer importing from api or repo (strict violation)
    if (imp.sourceLayer === 'domain' && 
        (imp.targetLayer === 'api' || imp.targetLayer === 'repo')) {
      violations.push({
        type: 'LAYER_VIOLATION',
        severity: 'error',
        message: `${imp.sourceModule}/domain imports ${imp.targetLayer} (${imp.raw})`,
        suggestion: 'Domain must be pure - no db/http dependencies',
        ...imp
      });
    }
    
    // Check 3: API layer importing from repo (should go through service)
    if (imp.sourceLayer === 'api' && imp.targetLayer === 'repo') {
      violations.push({
        type: 'API_REPO_COUPLING',
        severity: 'warning',
        message: `${imp.sourceModule}/api imports ${imp.targetLayer} (${imp.raw})`,
        suggestion: 'API should use service layer only',
        ...imp
      });
    }
    
    // Check 4: Worker importing from repo directly
    if (imp.sourceLayer === 'worker' && imp.targetLayer === 'repo' && imp.isCrossModule) {
      violations.push({
        type: 'WORKER_REPO_COUPLING',
        severity: 'info',
        message: `${imp.sourceModule}/worker imports ${imp.targetModule}/repo`,
        suggestion: 'Consider if service layer abstraction is needed',
        ...imp
      });
    }
  }
  
  return violations;
}

function buildDependencyGraph(imports) {
  const graph = new Map();
  
  for (const imp of imports) {
    if (!imp.isCrossModule) continue;
    
    const key = `${imp.sourceModule} → ${imp.targetModule}`;
    if (!graph.has(key)) {
      graph.set(key, {
        from: imp.sourceModule,
        to: imp.targetModule,
        layers: new Set(),
        count: 0
      });
    }
    const entry = graph.get(key);
    entry.layers.add(`${imp.sourceLayer}→${imp.targetLayer}`);
    entry.count++;
  }
  
  return graph;
}

function printReport(violations, dependencyGraph) {
  console.log('\n' + C.bold + '╔══════════════════════════════════════════════════════════════╗' + C.reset);
  console.log(C.bold + '║        MODULE DEPENDENCY ANALYSIS REPORT                     ║' + C.reset);
  console.log(C.bold + '╚══════════════════════════════════════════════════════════════╝' + C.reset);
  
  // Summary
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  const infos = violations.filter(v => v.severity === 'info');
  
  console.log(`\n${C.bold}Summary:${C.reset}`);
  console.log(`  ${C.red}Errors:   ${errors.length}${C.reset}`);
  console.log(`  ${C.yellow}Warnings: ${warnings.length}${C.reset}`);
  console.log(`  ${C.cyan}Info:     ${infos.length}${C.reset}`);
  console.log(`  ${C.green}Cross-module dependencies: ${dependencyGraph.size}${C.reset}`);
  
  // Errors
  if (errors.length > 0) {
    console.log(`\n${C.red}${C.bold}❌ LAYER VIOLATIONS (Must Fix):${C.reset}`);
    errors.forEach(v => {
      console.log(`  ${C.red}• ${v.message}${C.reset}`);
      console.log(`    File: ${v.sourceFile}`);
      console.log(`    ${C.cyan}→ ${v.suggestion}${C.reset}`);
    });
  }
  
  // Warnings
  if (warnings.length > 0) {
    console.log(`\n${C.yellow}${C.bold}⚠️  CROSS-MODULE COUPLING (Should Refactor):${C.reset}`);
    const grouped = warnings.reduce((acc, v) => {
      const key = `${v.sourceModule}→${v.targetModule}`;
      acc[key] = acc[key] || [];
      acc[key].push(v);
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([key, items]) => {
      console.log(`\n  ${C.yellow}${key}:${C.reset} (${items.length} imports)`);
      const uniqueFiles = [...new Set(items.map(i => i.targetFile))];
      uniqueFiles.forEach(f => console.log(`    - ${f}`));
    });
  }
  
  // Dependency Graph
  console.log(`\n${C.bold}📊 Module Dependency Graph:${C.reset}`);
  const sortedDeps = [...dependencyGraph.entries()].sort((a, b) => b[1].count - a[1].count);
  sortedDeps.forEach(([key, data]) => {
    const arrow = data.count > 5 ? '❗' : '  ';
    console.log(`  ${arrow} ${key}: ${data.count} imports`);
    console.log(`     Layers: ${[...data.layers].join(', ')}`);
  });
  
  // Recommendations
  console.log(`\n${C.bold}${C.cyan}💡 Recommendations:${C.reset}`);
  if (errors.length > 0) {
    console.log(`  1. Fix ${errors.length} layer violations immediately`);
  }
  if (warnings.length > 0) {
    console.log(`  2. Refactor cross-module repo imports to use service layer`);
    console.log(`     This reduces coupling and makes testing easier`);
  }
  console.log(`  3. Consider introducing a 'shared' module for common types`);
  console.log(`  4. Document approved cross-module dependencies in module READMEs`);
  
  console.log('\n');
}

// Main
console.log('🔍 Analyzing module dependencies...');

const allFiles = findAllTSFiles(MODULES_DIR);
console.log(`Found ${allFiles.length} TypeScript files`);

const allImports = [];
for (const file of allFiles) {
  const imports = analyzeFile(file);
  allImports.push(...imports);
}

const violations = analyzeViolations(allImports);
const dependencyGraph = buildDependencyGraph(allImports);

printReport(violations, dependencyGraph);

// Exit with error code if there are errors
if (violations.some(v => v.severity === 'error')) {
  process.exit(1);
}
