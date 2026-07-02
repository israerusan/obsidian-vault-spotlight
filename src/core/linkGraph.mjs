export function findBacklinks(files, resolvedLinks, targetPath) {
	const byPath = fileMap(files);
	const rows = [];
	for (const [source, links] of Object.entries(resolvedLinks || {})) {
		const count = Number(links?.[targetPath] || 0);
		if (count > 0 && byPath.has(source)) rows.push({ file: byPath.get(source), count });
	}
	return rows.sort((a, b) => b.count - a.count || a.file.path.localeCompare(b.file.path)).map((row) => row.file);
}

export function findOutlinks(files, resolvedLinks, sourcePath) {
	const byPath = fileMap(files);
	return Object.keys(resolvedLinks?.[sourcePath] || {})
		.filter((path) => byPath.has(path))
		.sort((a, b) => a.localeCompare(b))
		.map((path) => byPath.get(path));
}

export function findRelatedBySharedTags(rows, targetPath) {
	const target = rows.find((row) => row.path === targetPath);
	if (!target) return [];
	const targetTags = new Set((target.tags || []).map((tag) => String(tag).toLowerCase()));
	return rows
		.filter((row) => row.path !== targetPath)
		.map((row) => ({
			...row,
			_shared: (row.tags || []).filter((tag) => targetTags.has(String(tag).toLowerCase())).length,
		}))
		.filter((row) => row._shared > 0)
		.sort((a, b) => b._shared - a._shared || a.path.localeCompare(b.path))
		.map(({ _shared, ...row }) => row);
}

function fileMap(files) {
	return new Map((files || []).map((file) => [file.path, file]));
}
