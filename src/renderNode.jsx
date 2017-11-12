import React from "react"
import {tag} from "./utils.js"
import {headingTypes} from "./schema.js"

const renderers = {
    p({attributes, children}) {
        return <p {...attributes}>{children}</p>
    },
    img({node: {data}, attributes, children}) {
        return <figure {...attributes}>
            <figcaption>{children}</figcaption>
            <img {...data.toJS()} {...attributes} />
        </figure>
    },
    [tag]({attributes, children}) {
        const [caption, ...content] = children
        return <figure {...attributes}>
            <figcaption>{caption}</figcaption>
            <hr />
            {content}
        </figure>
    }
}

export default function renderNode(props) {
    const {node: {type}, attributes, children} = props
    if (headingTypes.includes(type)) {
        return React.createElement(type, attributes, children)
    } else if (renderers.hasOwnProperty(type)) {
        return renderers[type](props)
    }
}