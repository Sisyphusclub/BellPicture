import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, '..');
const sourceRoot = join(frontendRoot, 'src');
const manifestPath = join(frontendRoot, 'component-provenance.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const nativeTags = new Set(['button', 'input', 'select', 'textarea']);
const browserDialogMethods = new Set(['alert', 'confirm', 'prompt']);
const failures = [];
const nativeOccurrences = new Map();
const externalModuleConsumers = new Map();
let scannedFileCount = 0;

function toProjectPath(filePath) {
  return relative(frontendRoot, filePath).replaceAll('\\', '/');
}

function isWithinRoot(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [absolutePath] : [];
  });
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function literalAttribute(opening, name) {
  const attribute = opening.attributes.properties.find(
    (candidate) => ts.isJsxAttribute(candidate) && candidate.name.text === name,
  );
  if (!attribute || !ts.isJsxAttribute(attribute)) return undefined;
  if (!attribute.initializer) return true;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    (attribute.initializer.expression.kind === ts.SyntaxKind.TrueKeyword ||
      attribute.initializer.expression.kind === ts.SyntaxKind.FalseKeyword)
  ) {
    return attribute.initializer.expression.kind === ts.SyntaxKind.TrueKeyword;
  }
  return Symbol.for('dynamic');
}

function importMatchesPackage(moduleName, packageName) {
  if (packageName.endsWith('/')) return moduleName.startsWith(packageName);
  return moduleName === packageName || moduleName.startsWith(`${packageName}/`);
}

for (const absolutePath of sourceFiles(sourceRoot)) {
  scannedFileCount += 1;
  const file = toProjectPath(absolutePath);
  const sourceText = readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const allowsNativeImplementation = manifest.nativeImplementationRoots.some(({ root }) =>
    isWithinRoot(file, root),
  );

  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      for (const rule of manifest.foundationImports) {
        if (
          moduleName.startsWith(rule.prefix) &&
          !rule.allowedRoots.some((root) => isWithinRoot(file, root))
        ) {
          failures.push(
            `${file}:${lineOf(sourceFile, node)} imports ${moduleName} outside an approved shared-component root.`,
          );
        }
      }
      for (const packageName of manifest.forbiddenComponentPackages) {
        if (importMatchesPackage(moduleName, packageName)) {
          failures.push(
            `${file}:${lineOf(sourceFile, node)} imports forbidden component package ${moduleName}.`,
          );
        }
      }
      if (manifest.externalVisualExceptions.some((entry) => entry.module === moduleName)) {
        const consumers = externalModuleConsumers.get(moduleName) ?? [];
        consumers.push(file);
        externalModuleConsumers.set(moduleName, consumers);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'window' &&
      browserDialogMethods.has(node.expression.name.text)
    ) {
      failures.push(
        `${file}:${lineOf(sourceFile, node)} uses window.${node.expression.name.text}; use the shared modal/toast contract.`,
      );
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = ts.isIdentifier(node.tagName) ? node.tagName.text : null;
      if (tagName && nativeTags.has(tagName) && !allowsNativeImplementation) {
        const key = `${file}::${tagName}`;
        const occurrences = nativeOccurrences.get(key) ?? [];
        occurrences.push({ node, sourceFile });
        nativeOccurrences.set(key, occurrences);
      }
      const role = literalAttribute(node, 'role');
      if (
        role === 'button' &&
        tagName !== 'button' &&
        tagName !== 'Button' &&
        !allowsNativeImplementation
      ) {
        failures.push(
          `${file}:${lineOf(sourceFile, node)} implements role="button" outside a shared primitive.`,
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const approvedNativeKeys = new Set();
for (const exception of manifest.nativeControlExceptions) {
  const key = `${exception.file}::${exception.tag}`;
  approvedNativeKeys.add(key);
  const occurrences = nativeOccurrences.get(key) ?? [];
  if (occurrences.length !== exception.count) {
    failures.push(
      `${exception.file} expected ${exception.count} approved <${exception.tag}> occurrence(s), found ${occurrences.length}.`,
    );
    continue;
  }
  for (const { node, sourceFile } of occurrences) {
    for (const [attribute, expectedValue] of Object.entries(exception.requiredAttributes ?? {})) {
      const actualValue = literalAttribute(node, attribute);
      if (actualValue !== expectedValue) {
        failures.push(
          `${exception.file}:${lineOf(sourceFile, node)} approved <${exception.tag}> must keep ${attribute}=${JSON.stringify(expectedValue)}.`,
        );
      }
    }
  }
}

for (const [key, occurrences] of nativeOccurrences) {
  if (approvedNativeKeys.has(key)) continue;
  for (const { node, sourceFile } of occurrences) {
    const [file, tag] = key.split('::');
    failures.push(
      `${file}:${lineOf(sourceFile, node)} uses raw <${tag}> outside shared beUI/ui primitives.`,
    );
  }
}

for (const exception of manifest.externalVisualExceptions) {
  if (!existsSync(join(frontendRoot, exception.file))) {
    failures.push(`Documented external component file is missing: ${exception.file}.`);
  }
  const consumers = externalModuleConsumers.get(exception.module) ?? [];
  for (const consumer of consumers) {
    if (!exception.allowedConsumers.includes(consumer)) {
      failures.push(
        `${consumer} imports ${exception.module} outside its documented consumer boundary.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error('Component provenance check failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error('\nUpdate the implementation or document a narrowly scoped exception with rationale.');
  process.exitCode = 1;
} else {
  const approvedNativeCount = manifest.nativeControlExceptions.reduce(
    (total, exception) => total + exception.count,
    0,
  );
  console.log('Component provenance check passed.');
  console.log(`- ${scannedFileCount} TypeScript source files scanned`);
  console.log('- 0 visible native controls outside shared component roots');
  console.log(`- ${approvedNativeCount} hidden browser-control exception(s) verified`);
  console.log('- 0 forbidden component imports or browser dialogs');
}
