import fs from 'fs';
import path from 'path';

const SPEC_PATH = path.resolve(process.cwd(), 'openapi/spec.json');
const CONFIG_PATH = path.resolve(process.cwd(), 'openapi/spec-transform.config.json');
const SCHEMA_REF_PREFIX = '#/components/schemas/';

function loadJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stripSchemaPrefix(schemaKey, prefixes) {
	for (const prefix of prefixes) {
		const dottedPrefix = `${prefix}.`;
		if (schemaKey.startsWith(dottedPrefix)) {
			return schemaKey.slice(dottedPrefix.length);
		}
	}
	return null;
}

function buildRenameMap(schemas, prefixes) {
	const renameMap = new Map();

	for (const schemaKey of Object.keys(schemas)) {
		const newKey = stripSchemaPrefix(schemaKey, prefixes);
		if (!newKey) {
			continue;
		}

		if (renameMap.has(schemaKey)) {
			continue;
		}

		if (renameMap.has(newKey)) {
			const existingSource = [...renameMap.entries()].find(([, target]) => target === newKey)?.[0];
			throw new Error(`Schema rename collision: "${schemaKey}" and "${existingSource}" both map to "${newKey}"`);
		}

		if (schemaKey !== newKey && Object.prototype.hasOwnProperty.call(schemas, newKey)) {
			throw new Error(`Schema rename collision: "${schemaKey}" cannot become "${newKey}" because that key already exists`);
		}

		renameMap.set(schemaKey, newKey);
	}

	return renameMap;
}

function renameSchemas(schemas, renameMap) {
	const renamedSchemas = { ...schemas };

	for (const [oldKey, newKey] of renameMap) {
		renamedSchemas[newKey] = renamedSchemas[oldKey];
		delete renamedSchemas[oldKey];
	}

	return renamedSchemas;
}

function updateRefs(value, renameMap) {
	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			value[index] = updateRefs(value[index], renameMap);
		}
		return value;
	}

	if (!value || typeof value !== 'object') {
		return value;
	}

	if (typeof value.$ref === 'string' && value.$ref.startsWith(SCHEMA_REF_PREFIX)) {
		const schemaKey = value.$ref.slice(SCHEMA_REF_PREFIX.length);
		if (renameMap.has(schemaKey)) {
			return {
				...value,
				$ref: `${SCHEMA_REF_PREFIX}${renameMap.get(schemaKey)}`,
			};
		}
	}

	for (const key of Object.keys(value)) {
		value[key] = updateRefs(value[key], renameMap);
	}

	return value;
}

function countUpdatedRefs(value, renameMap) {
	let count = 0;

	function walk(node) {
		if (Array.isArray(node)) {
			node.forEach(walk);
			return;
		}

		if (!node || typeof node !== 'object') {
			return;
		}

		if (typeof node.$ref === 'string' && node.$ref.startsWith(SCHEMA_REF_PREFIX)) {
			const schemaKey = node.$ref.slice(SCHEMA_REF_PREFIX.length);
			if (renameMap.has(schemaKey)) {
				count += 1;
			}
		}

		for (const child of Object.values(node)) {
			walk(child);
		}
	}

	walk(value);
	return count;
}

function main() {
	const config = loadJson(CONFIG_PATH);
	const prefixes = config.schemaPrefixStrip;

	if (!Array.isArray(prefixes) || prefixes.length === 0) {
		throw new Error('openapi/spec-transform.config.json must define a non-empty schemaPrefixStrip array');
	}

	const spec = loadJson(SPEC_PATH);
	const schemas = spec.components?.schemas;

	if (!schemas || typeof schemas !== 'object') {
		throw new Error('openapi/spec.json is missing components.schemas');
	}

	const renameMap = buildRenameMap(schemas, prefixes);

	if (renameMap.size === 0) {
		console.log('OpenAPI preprocess: no schema prefixes to strip (already processed)');
		return;
	}

	const refsToUpdate = countUpdatedRefs(spec, renameMap);
	spec.components.schemas = renameSchemas(schemas, renameMap);
	updateRefs(spec, renameMap);

	fs.writeFileSync(SPEC_PATH, `${JSON.stringify(spec, null, 2)}\n`);
	console.log(`OpenAPI preprocess: renamed ${renameMap.size} schemas, updated ${refsToUpdate} $ref pointers`);
}

try {
	main();
} catch (error) {
	console.error(`OpenAPI preprocess failed: ${error.message}`);
	process.exit(1);
}
