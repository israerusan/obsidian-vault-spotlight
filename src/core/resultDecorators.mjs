export function buildFileDecorations({
	parentPath,
	modifiedLabel,
	fileKind,
	isStarred,
	isBookmarked,
	isRecent,
	primaryMatch,
	aliasMatched,
	tags,
	aliases,
}) {
	const badges = [];
	if (isStarred) badges.push("Starred");
	if (isBookmarked) badges.push("Bookmarked");
	if (isRecent) badges.push("Recent");
	if (fileKind && fileKind !== "note") badges.push(String(fileKind).toUpperCase());
	const meta = [parentPath, modifiedLabel]
		.filter(Boolean)
		.concat((Array.isArray(tags) ? tags : []).slice(0, 2).map((tag) => `#${String(tag).replace(/^#/, "")}`))
		.concat((Array.isArray(aliases) ? aliases : []).slice(0, 1).map((alias) => `aka ${alias}`))
		.join(" · ");
	const reason = reasonLabel(primaryMatch, aliasMatched);
	return { badges, meta, reason };
}

export function reasonLabel(primaryMatch, aliasMatched = false) {
	if (aliasMatched || primaryMatch === "alias") return "Matched alias";
	if (primaryMatch === "path") return "Matched path";
	if (primaryMatch === "filters") return "Matched filters";
	if (primaryMatch === "browse") return "Browse ranking";
	return "Matched filename";
}
