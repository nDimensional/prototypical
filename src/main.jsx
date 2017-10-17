import React from "react"
import {render} from "react-dom"
import Artifact from "./node.jsx"
import {create, getPath, mac} from "./utils"
import {Editor} from "slate-react"
import {State} from "slate"


const schema = {
    nodes: {
        artifact: Artifact,
    }
}

const initialState = State.fromJSON({
    document: {
        nodes: [
            {
                kind: "block",
                type: "paragraph",
                nodes: []
            }
        ]
    }
})

class App extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            schema,
            state: initialState,
            path: getPath(),
            node: null
        }
    }
    componentDidMount() {
        create().then(node => this.setState({node}))
        window.addEventListener("hashchange", event => {
            this.setState({
                path: getPath()
            })
        })
        window.addEventListener("keydown", event => {
            const {keyCode, ctrlKey, metaKey, shiftKey} = event
            if (keyCode === 83 && (mac ? metaKey : ctrlKey)) {
                event.preventDefault()
                console.log(this.state.state.toJSON())
                // this.root.save(this.state.node, shiftKey)
            }
        })
    }
    render() {
        const {path, node, state, schema} = this.state
        const header = this.renderHeader()
        return <Editor
            ref={editor => this.editor = editor}
            schema={schema}
            state={state}
            onChange={({state}) => this.setState({state})}
        />
    }
    renderHeader() {
        const {path} = this.props
        if (path) {
            const array = path.split("/")
            return array.map((name, index) => {
                const href = `#${array.slice(0, index + 1).join("/")}`
                return [
                    index > 0 && "/",
                    <a key={index} href={href}>{name}</a>
                ]
            })
        } else {
            return "prototypical"
        }
    }
}

const container = document.querySelector("main")
const component = <App />

render(component, container)