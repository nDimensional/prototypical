import * as R from "ramda"
import {defaultType, text, createNode} from "./schema.js"
import {collect, tag, headerTag, contentTag} from "./utils"
import {deserialize} from "./serialize.jsx"


function getText(block) {
    const {type} = block
    if (type === tag) {
        if (block.nodes.size === 2 && block.nodes.get(0).type === headerTag) {
            return block.nodes.get(0).text
        }
    }
    return block.text
}

function validateBlock(block, editor) {
    if (block.type === headerTag || block.type === contentTag) {
        return
    }
    const updates = {}

    // Type
    const blockText = getText(block)
    const type = Object.keys(text).find(key => text[key].test(blockText)) || defaultType
    if (block.type !== type) {
        updates.type = type
    }

    // Data
    if (type === "img") {
        const [match, alt, src] = text.img.exec(blockText)
        const data = {alt, src}
        if (!block.data || !R.equals(data, block.data.toJS())) {
            updates.data = data
        }
    } else if (type === tag && ![headerTag, contentTag].includes(block.type)) {
        const [match, name, path] = text[tag].exec(blockText)
        const data = {name, path}
        if (!block.data || !R.equals(data, block.data.toJS())) {
            updates.data = data
        }
        if (!block.data || data.path !== block.data.get("path")) {
            collect(editor.props.node, path).then(root => {
                const {document: {nodes}} = deserialize(root)
                editor.change(change => {
                    change.replaceNodeByKey(block.key, createNode(data, nodes))
                })
            })
        }
        return
    }

    // Return collective change
    if (Object.keys(updates).length > 0) {
        return change => change.setNodeByKey(block.key, updates)
    }
}

export default function validateNode(node, editor) {
    if (node.kind === "block") {
        return validateBlock(node, editor)
    }
}