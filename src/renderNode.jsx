import React from "react"
import md from "markdown-it"
import transclusion from "./plugins/transclusion.js"

const mdHeading = md("zero")
mdHeading.enable("heading")
mdHeading.enable("image")
mdHeading.use(transclusion)

function renderParagraph(attributes, children, inline) {
    if (inline.children.length === 1) {
        const [token] = inline.children
        const data = {}
        if (token.attrs && token.attrs.length) {
            token.attrs.forEach(([key, value]) => data[key] = value)
        }
        if (token.type === "image") {
            return <figure {...attributes}>
                <figcaption>{children}</figcaption>
                <img {...data}/>
            </figure>
        } else if (token.type === "transclusion") {
            // oh boy
        }
    }
    return <p {...attributes}>{children}</p>
}

function renderLine(props) {
    const {node, attributes, children} = props
    const tokens = mdHeading.parse(node.text, {})
    if (tokens.length === 3) {
        const [open, inline, close] = tokens
        if (open.type === "heading_open" && close.type === "heading_close") {
            return React.createElement(open.tag, attributes, children)
        } else if (open.type === "paragraph_open" && close.type === "paragraph_close") {
            return renderParagraph(attributes, children, inline)
        }
    }
}

export default function renderNode(props) {
    const {node: {type}, attributes, children} = props
    switch (type) {
        // case "line":
        //     return renderLine(props)
        case "p":
            return <p {...attributes}>{children}</p>
        case "h1":
            return <h1 {...attributes}>{children}</h1>
        case "h2":
            return <h2 {...attributes}>{children}</h2>
        case "h3":
            return <h3 {...attributes}>{children}</h3>
    }
}