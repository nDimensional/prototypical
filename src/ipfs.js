import IPFS from "ipfs"

export default function() {
	const options = {
		repo: "ipfs/pubsub-demo/" + Math.random(),
		EXPERIMENTAL: {
			pubsub: true,
			sharding: true,
			dht: true,
			relay: true,
		},
		config: {
			Addresses: {
				API: "",
				Gateway: "",
				Swarm: [
					"/ip4/0.0.0.0/tcp/0",
					"/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star",
				],
			},
		},
	}
	return new Promise((resolve, reject) => {
		const node = new IPFS(options)
		node.on("error", error => reject(error))
		node.on("ready", () => resolve(node))
	})
}
