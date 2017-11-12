import React from "react"
import "babel-polyfill"
import {render} from "react-dom"
import {Editor} from "slate-react"
import {html, serialize, deserialize} from "./serialize.jsx"

import {create, add, collect, getPath, mac, key} from "./utils"

import validateNode from "./validateNode.js"
import decorateNode from "./decorateNode.js"
import renderNode from "./renderNode.jsx"
import renderMark from "./renderMark.jsx"
import schema from "./schema.js"

const placeholder = "<p>LOADING...</p>"

class App extends React.Component {
    constructor(props) {
        super(props)
        const path = getPath()
        const readOnly = path !== ""
        const value = html.deserialize(readOnly ? placeholder : "<p></p>")
        this.state = {readOnly, path, value, root: null}
    }
    componentDidMount() {
        const {readOnly, path} = this.state
        create().then(node => {
            window.node = node
            console.log("ipfs ready")
            this.setState({node})
            if (readOnly) {
                collect(node, path).then(root => {
                    const value = deserialize(root)
                    const state = {root, value, readOnly: false}
                    this.setState(state)
                })
            }


        })

        window.addEventListener("keydown", async (event) => {
            const {keyCode, ctrlKey, metaKey} = event
            if (keyCode === 83 && (mac ? metaKey : ctrlKey)) {
                event.preventDefault()
                const files = serialize(this.state.value)
                add(this.state.node, files).then(files => {
                    const {hash} = files.find(({path}) => path === key)
                    location.hash = hash
                })
            }
        })

        window.addEventListener("hashchange", event => {
            console.log("hash changed")
            this.setState({
                path: getPath()
            })
        })
    }
    render() {
        const {node, value, readOnly} = this.state
        return <Editor
            ref={editor => window.editor = this.editor = editor}
            schema={schema}
            value={value}
            node={node}
            readOnly={readOnly}
            placeholder={"What's on your mind?"}
            onChange={props => this.onChange(props)}
            validateNode={node => validateNode(node, this.editor)}
            decorateNode={decorateNode}
            renderNode={renderNode}
            renderMark={renderMark}
        />
    }
    onChange(change) {
        const {value} = change
        this.setState({value})
    }
}

const container = document.querySelector("main")
const component = <App />

render(component, container)