function uuidV4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}

const IPFS = {
    create() {
        return new Promise((resolve, reject) => {
            const node = new Ipfs({
                // config: {
                //     Bootstrap: [
                //         "/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd",
                //         "/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3",
                //         "/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM",
                //         "/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu",
                //         "/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm",
                //         "/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64"
                //     ]
                // }
            })
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
    put(node, tree) {
        const options = { format: "dag-cbor", hashAlg: "sha2-256" }
        // const options = {}
        node.dag.put(tree, options, (error, cid) => {
            console.log("cid", cid.toBaseEncodedString())
        })
    },
    get(node, hash) {
        const options = {}
        node.dag.get(hash, options, (error, result) => {
            console.log(result)
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
}