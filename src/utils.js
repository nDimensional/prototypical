import IPFS from "ipfs"

const { platform } = navigator
const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
export const mac = macosPlatforms.includes(platform)
const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
export const win = windowsPlatforms.includes(platform)
const iosPlatforms = ['iPhone', 'iPad', 'iPod']
export const ios = iosPlatforms.includes(platform)

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

export function get(node, hash) {
    const options = {}
    return new Promise((resolve, reject) => {
        node.dag.get(hash, options, (error, {value}) => {
            if (error) {
                reject(error)
            } else {
                resolve(value)
            }
        })
    })
}

export function put(node, object) {
    const options = { format: "dag-cbor", hashAlg: "sha2-256" }
    return new Promise((resolve, reject) => {
        node.dag.put(object, options, (error, cid) => {
            if (error) {
                reject(error)
            } else {
                resolve(cid.toBaseEncodedString())
            }
        })
    })
}

export function tree(node, hash) {
    const options = {}
    return new PRomise((resolve, reject) => {
        node.dag.tree(hash, options, (error, result) => {
            if (error) {
                reject(error)
            } else {
                resolve(result)
            }
        })
    })
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
        const name = route.pop()
        const directory = route.reduce((parent, child) => parent[child], map)
        directory[name] = text === undefined ? {} : text
    })
    return map
}

export function uuidV4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}