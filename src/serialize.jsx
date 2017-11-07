import React from 'react'
import Html from 'slate-html-serializer'
import {blockTypes, text, headings} from "./schema.js"

const rules = [{
    deserialize(element, next) {
        const type = element.tagName.toLowerCase()
        if (blockTypes.includes(type)) {
            const block =  {kind: "block", type}
            if (headings.hasOwnProperty(type)) {
                const node = document.createTextNode(headings[type] + " ")
                element.insertBefore(node, element.firstChild)
                element.normalize()
                block.nodes = next(element.childNodes)
            } else if (type === "p") {
                block.nodes = next(element.childNodes)
            } else if (type === "img") {
                const {src, alt} = element
                block.data = {src, alt}
                block.nodes = next([document.createTextNode(`![${alt}](${src})`)])
            } else if (type === "node") {
                //
            }
            return block
        }
    },
    serialize(object, children) {
        const {kind, type, data} = object
        if (kind === "block") {
            if (headings.hasOwnProperty(type)) {
                const [[first, ...rest], ...last] = children.toJS()
                if (first && text[type].test(first[0])) {
                    const {length} = headings[type]
                    first[0] = first[0].slice(length).trim()
                    return React.createElement(type, {}, [[first, ...rest], ...last])
                }
            } else if (type === "p") {
                return <p>{children}</p>
            } else if (type === "img") {
                return <img {...data.toJS()} />
            } else if (type === "node") {
                //
            }
        }
    }
}]

export default new Html({rules})