function uuidV4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

const IPFS = {
    create() {
        const options = {}
        return new Promise((resolve, reject) => {
            const node = new Ipfs(options)
            node.on("error", error => reject(error))
            node.on("ready", () => resolve(node))
        })
    },
    add(node, files) {
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
    },
    tree(node, hash) {
        const options = {}
        return new Promise((resolve, reject) => {
            node.dag.tree(hash, options, (error, value) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(value)
                }
            })
        })
    },
    put(node, tree) {
        const options = { format: "dag-cbor", hashAlg: "sha2-256" }
        // const options = {}
        return new Promise((resolve, reject) => {
            node.dag.put(tree, options, (error, cid) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(cid.toBaseEncodedString())
                }
            })
        })
    },
    get(node, hash) {
        const options = {}
        return new Promise((resolve, reject) => {
            node.dag.get(hash, options, (error, result) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(result)
                }
            })
        })
    },
    cat(node, hash) {
        let result = ""
        return new Promise((resolve, reject) =>
            node.files.cat(hash, (error, stream) => {
                if (error) {
                    reject(error)
                } else {
                    stream.on("data", chunk => result += chunk.toString())
                    stream.on("error", error => reject(error))
                    stream.on("end", () => resolve(result))
                }
            })
        )
    },
    async collect(node, hash) {
        const stream = await node.files.get(hash)
        return new Promise((resolve, reject) => {
            const files = []
            stream.on("error", error => reject(error))
            stream.on("end", () => resolve(Promise.all(files)))
            stream.on("data", ({path, content, hash}) => {
                if (content) {
                    files.push(new Promise((resolve, reject) => {
                        let text = ""
                        content.on("error", error => reject(error))
                        content.on("end", () => resolve({path, text}))
                        content.on("data", data => text += data.toString())
                        content.resume()
                    }))
                } else if (hash) {
                    files.push({path, hash: node.types.multihash.toB58String(hash)})
                }
            })
        })
    }
}
