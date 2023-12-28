import fs from 'fs'

/**
 * @param {fs.PathLike} p
 */
export function rimraf(p) {
	// The rimraf package uses maxRetries=10 on Windows, but Node's fs.rm does not have that special case.
	return fs.promises.rm(p, {recursive: true, force: true, maxRetries: process.platform === "win32" ? 10 : 0});
}