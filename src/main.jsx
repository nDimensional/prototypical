import React, {Component} from "react"
import "babel-polyfill"
import {render} from "react-dom"
import {Editor} from "slate-react"

import {html, serialize, deserialize} from "./serialize.jsx"
import {autoClose, indent} from "./plugins.js"

import {create, save, load, getPath, mac, key, tag, index} from "./utils.js"

import validateNode from "./validateNode.js"
import decorateNode from "./decorateNode.js"
import renderNode from "./renderNode.jsx"
import renderMark from "./renderMark.jsx"
import schema, {createHeader} from "./schema.js"

const placeholder = "<p>LOADING...</p>"

const plugins = [autoClose(["[]", "()"]), indent()]

class App extends Component {
    constructor(props) {
        super(props)
        const path = getPath()
        const readOnly = path !== ""
        const value = html.deserialize(readOnly ? placeholder : "<p></p>")
        this.state = {readOnly, path, value, root: null}
        this.reload = true
    }
    async componentDidMount() {
        window.addEventListener("keydown", event => {
            const {keyCode, ctrlKey, metaKey} = event
            if (keyCode === 83 && (mac ? metaKey : ctrlKey)) {
                event.preventDefault()
                this.save()
            }
        })

        window.addEventListener("hashchange", event => {
            if (this.reload) {
                const path = getPath()
                this.setState({path, readOnly: true}, () => this.load())
            } else {
                this.reload = true
            }
        })

        const node = await create()
        this.setState({node}, () => this.load())
        window.node = node
        console.log("ipfs initialized")
    }
    async save() {
        const value = serialize(this.state.value)
        const files = await save(this.state.node, value)
        const children = files.filter(({path}) => path.split("/").pop() !== index)
        children.forEach(({path, hash}) => {
            if (path === key) {
                this.reload = false
                window.location.hash = hash
            } else {
                const route = path.split("/").slice(1)
                const name = route[route.length - 1]
                const [node, content] = route.reduce(([child, parent], name) => {
                    const nodes = parent.nodes.filter(node => node.type === tag)
                    const node = nodes.find(node => node.nodes.get(0).text.indexOf(`@[${name}]`) === 0)
                    return [node, node.nodes.get(1)]
                }, [null, this.state.value.document])
                const {key} = node.nodes.get(0)
                const header = createHeader({name, path: hash})
                this.editor.change(change => change.replaceNodeByKey(key, header))
            }
        })
    }
    async load() {
        const {path, node, readOnly} = this.state
        if (readOnly) {
            const root = await load(node, path)
            const value = deserialize(root)
            this.setState({root, value, readOnly: false})
        }
    }
    render() {
        const {node, value, readOnly} = this.state
        return <Editor
            plugins={plugins}
            autoFocus={true}
            ref={editor => this.editor = window.editor = editor}
            schema={schema}
            value={value}
            node={node}
            readOnly={readOnly}
            placeholder={"hello"}
            onChange={props => this.onChange(props)}
            validateNode={node => validateNode(node, this.editor, this.state.root)}
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