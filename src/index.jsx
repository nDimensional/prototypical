import React from "react"
import { render } from "react-dom"
import Editor from "./editor.jsx"

import createYjs from "./y"
import createIpfs from "./ipfs"
import { getPath, tag } from "./utils"
;(async function() {
	const room = "fjdklsfjkdljfklsjfkdls"

	const ipfs = await createIpfs()
	window.ipfs = ipfs
	console.log("initialized ipfs")

	const y = await createYjs(ipfs, room)
	console.log("initialised yjs")

	const path = getPath()
	const main = document.querySelector("main")
	const editor = <Editor path={path} ipfs={ipfs} y={y} />
	render(editor, main)
})()
