import React from "react"
import {headings, text} from "./schema.js"

const renderers = {
    p({attributes, children}) {
        return <p {...attributes}>{children}</p>
    },
    img({node, attributes, children}) {
        const [match, alt, src] = text.img.exec(node.text)
        const data = {alt, src}
        return <figure {...attributes}>
            <figcaption>{children}</figcaption>
            <img {...data} {...attributes} />
        </figure>
    },
    node({node, attributes, children}) {
        const [match, name, path] = text.node.exec(node.text)
        const data = {name, path}
        return <figure {...attributes}>
            <figcaption>{children}</figcaption>
            <span>This is a node with name {name} and path {path}</span>
        </figure>
    }
}

export default function renderNode(props) {
    const {node: {type}, attributes, children} = props
    if (headings.hasOwnProperty(type)) {
        return React.createElement(type, attributes, children)
    } else if (renderers.hasOwnProperty(type)) {
        return renderers[type](props)
    }
}