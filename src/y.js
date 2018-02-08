import yJS from "../yjs/yjs/src/Y.js"

// const yJS = require("yjs/dist/y.js")
// const yArray = require("y-array/dist/y-array")
// const yText = require("y-text/dist/y-text")
// const yMap = require("y-map/dist/y-map")
// const yMemory = require("y-memory/dist/y-memory")
// const yIpfs = require("y-ipfs-connector")

import yMemory from "../yjs/y-memory.js"
import yIpfs from "../yjs/y-ipfs-connector"

import { tag } from "./utils"

yJS.extend(yMemory, yIpfs)
export const Y = yJS
window.Y = yJS

export default async function(ipfs, room) {
	const y = await new Y(room, {
		db: {
			name: "memory",
		},
		connector: {
			name: "ipfs",
			ipfs,
			room,
		},
		share: {
			pool: "Map",
		},
	})
	y.define("pool", Y.Map)
	return (window.y = y)
}
