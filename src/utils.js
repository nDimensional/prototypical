const { platform } = navigator
const macosPlatforms = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"]
export const mac = macosPlatforms.includes(platform)
const windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"]
export const win = windowsPlatforms.includes(platform)
const iosPlatforms = ["iPhone", "iPad", "iPod"]
export const ios = iosPlatforms.includes(platform)

export const index = "index.html"
export const key = "prototypical"
export const tag = "proto-node"
export const headerTag = "proto-header"
export const contentTag = "proto-content"

export function getPath() {
	return window.location.hash.slice(1)
}

export async function save(node, files) {
	const encoder = new TextEncoder("utf-8")
	const buffers = files.map(({ path, text }) => ({
		path,
		content: new node.types.Buffer(encoder.encode(text)),
	}))
	return await node.files.add(buffers)
}

export async function load(node, hash) {
	const links = {}
	const decoder = new TextDecoder("utf-8")
	const files = await node.files.get(hash)
	files.forEach(({ path, hash, content }) => {
		const [root, ...route] = path.split("/")
		if (route.length > 0) {
			const name = route.pop()
			const directory = route.reduce((map, name) => map[name].links, links)
			directory[name] = content
				? decoder.decode(content)
				: { hash: node.types.multihash.toB58String(hash), links: {} }
		}
	})
	return { hash, links }
}
