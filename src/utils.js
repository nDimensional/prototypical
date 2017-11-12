import IPFS from "ipfs"

const { platform } = navigator
const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
export const mac = macosPlatforms.includes(platform)
const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
export const win = windowsPlatforms.includes(platform)
const iosPlatforms = ['iPhone', 'iPad', 'iPod']
export const ios = iosPlatforms.includes(platform)

export const index = "index.html"
export const key = "prototypical"
export const tag = "proto-node"
export const headerTag = "proto-header"
export const contentTag = "proto-content"

export function getPath() {
    return window.location.hash.slice(1)
}

export function create() {
    const options = {}
    return new Promise((resolve, reject) => {
        const node = new IPFS(options)
        node.on("error", error => reject(error))
        node.on("ready", () => resolve(node))
    })
}

export async function add(node, files) {
    const buffers = files.map(({ path, text }) => ({ path, content: new node.types.Buffer(text)}))
    return new Promise((resolve, reject) =>
        node.files.add(buffers, (error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        })
    )
}

export async function collect(node, hash) {
    const map = {}
    const stream = await node.files.get(hash)
    const files = await Promise.all(
        await new Promise((resolve, reject) => {
            const files = []
            stream.on("error", error => reject(error))
            stream.on("end", () => resolve(files))
            stream.on("data", ({path, content}) => {
                if (content) {
                    files.push(new Promise((resolve, reject) => {
                        let text = ""
                        content.on("error", error => reject(error))
                        content.on("end", () => resolve({path, text}))
                        content.on("data", data => text += data.toString())
                        content.resume()
                    }))
                } else {
                    files.push({path})
                }
            })
        })
    )

    files.forEach(({path, text}) => {
        const [hash, ...route] = path.split("/")
        if (route.length > 0) {
            const name = route.pop()
            const directory = route.reduce((parent, child) => parent[child], map)
            directory[name] = text === undefined ? {} : text
        }
    })
    return map
}
