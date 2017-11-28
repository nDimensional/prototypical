import React from 'react'
import {Value} from "slate"
import Html from 'slate-html-serializer'
import {tag, key, index, headerTag, contentTag} from "./utils.js"
import {blockTypes, text, headings, emptyContent, emptyHeader, createText} from "./schema.js"

const head = `<meta charset="UTF-8"><title>${key}</title>`
const style = ""
function template(body) {
    return `<!DOCTYPE html><html lang="en"><head>${head}</head><style>${style}</style><body>${body}</body></html>`
}

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
            } else if (type === tag) {
                const name = element.getAttribute("name")
                block.data = {name, empty: true}
                block.nodes = [emptyHeader, emptyContent]
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
            } else if (type === tag) {
                const {name} = data.toJS()
                return React.createElement(tag, {name}, [])
            } else if (type === headerTag || type === contentTag) {
                return []
            } else if (type === contentTag) {
                return []
            }
        }
    }
}]

export const html = new Html({rules})

function rehydrate(block, route, files) {
    const {nodes: [header, {nodes}], data: {name}} = block.toJS()
    const value = Value.create({document: {nodes}})
    dehydrate(value, [...route, name], files)
}

function dehydrate(value, route, files) {
    const text = template(html.serialize(value))
    const path = `${route.join("/")}/${index}`
    files.push({path, text})
    value.document.nodes
        .filter(({kind, type}) => kind === "block" && type === tag)
        .forEach(block => rehydrate(block, route, files))
}

export function serialize(value) {
    const files = []
    dehydrate(value, [key], files)
    return files
}

export function deserialize(root, path) {
    const route = path || []
    const text = root.links[index]
    const value = html.deserialize(text).toJS()
    Object.keys(root.links).filter(key => key !== index).forEach(key => {
        const node = value.document.nodes.find(({kind, type, data: {name}}) => type === tag && name === key)
        if (node) {
            const {nodes: [header, content], data: {name}} = node
            const {document: {nodes}} = deserialize(root.links[key], route.concat([name]))
            node.data = {name, path: root.links[key].hash}
            header.nodes = [createText(`@[${name}](${root.links[key].hash})`)]
            content.nodes = nodes
        } else {
            console.error("cooler! By the lake.")
        }
    })

    return Value.create(value)
}