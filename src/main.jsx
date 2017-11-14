import React from "react"
import "babel-polyfill"
import {render} from "react-dom"
import {Editor} from "slate-react"
import {html, serialize, deserialize} from "./serialize.jsx"

import {create, add, collect, getPath, mac, key} from "./utils.js"

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
        this.state = {readOnly, path, value, root: null, reload: true}
    }
    componentDidMount() {
        create().then(node => {
            console.log("ipfs initialized")
            this.setState({node}, () => this.load())
        })

        window.addEventListener("keydown", async (event) => {
            const {keyCode, ctrlKey, metaKey} = event
            if (keyCode === 83 && (mac ? metaKey : ctrlKey)) {
                event.preventDefault()
                const files = serialize(this.state.value)
                add(this.state.node, files).then(files => {
                    const {hash} = files.find(({path}) => path === key)
                    this.setState({reload: false}, () => location.hash = hash)
                    // location.hash = hash
                })
            }
        })

        window.addEventListener("hashchange", event => {
            const {reload} = this.state
            if (reload) {
                console.log("hash updated externally")
                const path = getPath()
                this.setState({path, readOnly: true}, () => this.load())
            } else {
                console.log("hash changed internally")
                this.setState({reload: true})
            }
        })
    }
    load() {
        const {path, node, saved, readOnly} = this.state
        if (readOnly) {
            console.log("collecting")
            collect(node, path).then(root => {
                const value = deserialize(root)
                this.setState({root, value, readOnly: false})
            })
        }
    }
    render() {
        const {node, value, readOnly} = this.state
        return <Editor
            ref={editor => window.editor = this.editor = editor}
            schema={schema}
            value={value}
            node={node}
            readOnly={readOnly}
            placeholder={"hello"}
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