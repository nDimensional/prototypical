import {defaultType, text, createNode} from "./schema.js"
import {load, tag, headerTag, contentTag} from "./utils"
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

function loadNode(editor, {name, path}, key) {
    load(editor.props.node, path).then(root => {
        const {document: {nodes}} = deserialize(root)
        const node = createNode({name, path, loading: false}, nodes)
        editor.change(change => change.replaceNodeByKey(key, node))
    })
}

function validateBlock(block, editor, root) {

    if (block.type === "please-wrap-me") {
        // okay
        // const data = {name: "Test Name", path: "foobar"}
        // const {nodes, key} = block.toJS()
        // return change => change.replaceNodeByKey(block.key, createNode(data, nodes))
    }

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
        if (!block.data || alt !== block.data.get("alt") || src !== block.data.get("src")) {
            updates.data = {alt, src}
        }
    } else if (type === tag) {
        const [match, name, path] = text[tag].exec(blockText)
        if (block.data) {
            const data = block.data.toJS()
            if (data.path !== path) {
                if (!data.loading) {
                    updates.data = {name, path, loading: true}
                    loadNode(editor, {name, path}, block.key)
                }
            } else if (data.name !== name) {
                updates.data = {name, path, loading: false}
            }
        } else {
            updates.data = {name, path, loading: true}
            loadNode(editor, {name, path}, block.key)
        }
    }

    // Return collective change
    if (Object.keys(updates).length > 0) {
        return change => change.setNodeByKey(block.key, updates)
    }
}

export default function validateNode(node, editor, root) {
    if (node.kind === "block") {
        return validateBlock(node, editor, root)
    }
}
