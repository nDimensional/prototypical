import md from "markdown-it"
import {Data} from "slate"

const mdInline = md({
    linkify: true,
})

mdInline.disable("image")

function decorateInline(index, key, children, decorations) {
    const tags = []
    if (children && children.length > 0) children.forEach(child => {
        const {attrs, type, tag, info, content, markup, nesting} = child
        if (type === "text") {
            index += content.length
        } else if (type === "link_open") {
            if (info === "auto") {
                // Do nothing
            } else {
                index += 1
            }
            const data = {}
            if (attrs && attrs.length) {
                attrs.forEach(([key, value]) => data[key] = value)
            }
            tags.push({anchorOffset: index, data})
        } else if (type === "link_close") {
            const {anchorOffset, data} = tags.pop()
            const length = Object.keys(data).reduce((sum, key) => sum + data[key].length, 0)
            const decoration = {
                anchorKey: key,
                focusKey: key,
                marks: [{type: tag, data: Data.create(data)}]
            }
            if (info === "auto") {
                decoration.anchorOffset = anchorOffset
                decoration.focusOffset = index
            } else {
                index += 2
                decoration.anchorOffset = index
                index += length
                decoration.focusOffset = index
                index += 1
            }
            decorations.push(decoration)
        } else if (nesting === 1) {
            tags.push({anchorOffset: index})
            index += markup.length
        } else if (nesting === -1) {
            const {anchorOffset} = tags.pop()
            index += markup.length
            decorations.push({
                anchorKey: key,
                anchorOffset,
                focusKey: key,
                focusOffset: index,
                marks: [{type: tag}],
            })
        } else if (type === "code_inline") {
            const length = (2 * markup.length) + content.length
            decorations.push({
                anchorKey: key,
                anchorOffset: index,
                focusKey: key,
                focusOffset: index + length,
                marks: [{type: tag}]
            })
            index += length
        // } else if (type === "image") {
        //     index += 2
        //     if (child.children && child.children.length) {
        //         decorateInline(index, key, child.children, decorations)
        //     }
        //     index += content.length
        //     const length = 5 + attrs.reduce((prev, attr) => prev + attr[1].length, 0)
        //     const attributes = {}
        //     if (attrs && attrs.length) {
        //         attrs.forEach(([key, value]) => attributes[key] = value)
        //     }
        //     decorations.push({
        //         anchorKey: key,
        //         anchorOffset: index,
        //         focusKey: key,
        //         focusOffset: index + length,
        //         marks: [{type: tag, data: Data.create(attributes)}]
        //     })
        } else {
            console.log("wow", type, child)
        }
    })
}

export default function decorateNode(node) {
    const {kind, type} = node
    const decorations = []
    if (kind === "block" && type === "line") {
        const texts = node.getTexts().toArray()
        const env = {}
        texts.forEach(({key, text}) => {
            const tokens = mdInline.parseInline(text, env)
            if (tokens && tokens.length === 1) {
                const [{children}] =  tokens
                decorateInline(0, key, children, decorations)
            }
        })
    }
    return decorations
}