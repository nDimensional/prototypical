import React from "react"
import ReactDOM from "react-dom"
import Editor from "./editor.jsx"

import createIpfs from "./ipfs"

const header = document.querySelector("header")
const main = document.querySelector("main")

createIpfs().then(ipfs => ReactDOM.render(<Editor ipfs={ipfs} />, main))
// ReactDOM.render(<Editor ipfs={null} />, main)
