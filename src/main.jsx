import React from "react"
import {render} from "react-dom"
import {Editor} from "slate-react"
import Plain from "slate-plain-serializer"
import serializer from "./serialize.jsx"
import md from "markdown-it"

import {create, getPath, mac, key} from "./utils"

const markdown = md("commonmark")

import decorateNode from "./decorateNode.js"
import renderNode from "./renderNode.jsx"
import renderMark from "./renderMark.jsx"
import state from "./state.jsx"

class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = state
    }
    componentWillMount() {
        window.addEventListener("keydown", event => {
            const {keyCode, ctrlKey, metaKey} = event
            if (keyCode === 83 && (mac ? metaKey : ctrlKey)) {
                event.preventDefault()
                const value = Plain.serialize(this.state.value)
                console.log("saving", value)
                localStorage.setItem(key, value)
            }
        })
    }
    // componentDidMount() {
    //     // create().then(node => this.setState({node}))
    //     // window.addEventListener("hashchange", event => {
    //     //     this.setState({
    //     //         path: getPath()
    //     //     })
    //     // })
    //     window.s = () => this.state.state.toJSON()
    // }
    render() {
        const {path, node, value, schema} = this.state
        return <Editor
            schema={schema}
            value={value}
            placeholder={"What's on your mind?"}
            onChange={props => this.onChange(props)}
            decorateNode={decorateNode}
            renderNode={renderNode}
            renderMark={renderMark}
        />
    }
    onChange(change) {
        const {kind, value} = change
        console.log(value.toJS())
        // const text = serializer.serialize(value)
        // const tokens = markdown.parse(text)
        // console.log(value)
        // console.log(text)
        // if (text !== this.state.text) {
        //     const html = markdown.render(text, {})
        //     // TODO: roundtrip value -> plaintext -> markdown -> html -> value
        //     // ~~ woah ~~
        //     // this.setState({value})
        //     this.setState({value: serializer.deserialize(html), text})
        // }
        this.setState({value})
    }
    // renderHeader() {
    //     const {path} = this.props
    //     if (path) {
    //         const array = path.split("/")
    //         return array.map((name, index) => {
    //             const href = `#${array.slice(0, index + 1).join("/")}`
    //             return [
    //                 index > 0 && "/",
    //                 <a key={index} href={href}>{name}</a>
    //             ]
    //         })
    //     } else {
    //         return "prototypical"
    //     }
    // }
}

const container = document.querySelector("main")
const component = <App />

render(component, container)