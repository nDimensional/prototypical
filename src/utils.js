const { platform } = navigator
const macosPlatforms = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"]
export const mac = macosPlatforms.includes(platform)
const windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"]
export const win = windowsPlatforms.includes(platform)
const iosPlatforms = ["iPhone", "iPad", "iPod"]
export const ios = iosPlatforms.includes(platform)

export function getPath() {
	return window.location.hash.slice(1)
}

export function getRoom() {
	return window.location.search.slice(1)
}
