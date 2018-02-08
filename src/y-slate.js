import {Text} from "slate"
window.Text = Text

export default class YSlate {
    constructor(Y, share, value) {
        this.Y = Y
        this.share = share
        this.document = share.document
        this.data = share.data

        // initialize data
        Array.from(value.data.keys()).forEach(key => {
            // do something to populate this.data from value.data
        })

        // initialize document
        this.copyNode(this.document, value.document)
    }
    observe(key, callback) {
        this.share[key].observeDeep(callback)
    }
    nodeToJS(node) {
        const object = node.get("object")
        if (object === "text") {
            return Text.create({text: node.get("characters").toString()})
        } else {
            const data = node.get("data")
            const nodes = node.get("nodes").toArray().map(node => this.nodeToJS(node))
            if (object === "document") {
                return {object, data, nodes}
            } else {
                const type = node.get("type")
                return {object, type, data, nodes}
            }
        }
    }
    copyNode(type, node) {
        const {object, data, nodes, key} = node
        type.set("object", object)
        // type.set("key", key)
        if (object === "block" || object === "inline" || object === "document") {
            // type.set("data", data)
            type.set("nodes", this.Y.Array)
            if (object !== "document") {
                type.set("type", node.type)
            }
            const children = type.get("nodes")
            nodes.forEach((node, index) => {
                children.push([this.Y.Map])
                this.copyNode(children.get(index), node)
            })
        } else if (object === "text") {
            type.set("characters", this.Y.Text)
            const {text} = node
            if (text) {
                type.get("characters").insert(0, text)
            }
        }
    }
    resolvePath(path) {
        return path.reduce((node, index) => node.get("nodes").get(index), this.document)
    }
    operate(operation) {
        const {type} = operation
        if (this[type] !== undefined) {
            // console.log(type, operation)
            this[type](operation)
        }
    }
    insert_text({path, offset, text, marks}) {
        // ignore marks for now
        const node = this.resolvePath(path)
        node.get("characters").insert(offset, text)
    }
    remove_text({path, offset, text}) {
        const node = this.resolvePath(path)
        const {length} = text
        node.get("characters").delete(offset, length)
    }
    add_mark({path, offset, length, mark}) {
        // ignore marks for now
    }
    remove_mark({path, offset, length, mark}) {
        // ignore marks for now
    }
    set_mark({path, offset, length, mark, properties}) {
        // ignore marks for now
    }
    insert_node({path, node}) {
        const index = path.pop()
        const target = this.resolvePath(path)
        const children = target.get("nodes")
        children.insert(index, [this.Y.Map])
        this.copyNode(children.get(index), node)
    }
    merge_node({path, position}) {
        const index = path.pop()
        const leftPath = [...path, index - 1]
        const rightPath = [...path, index]
        const one = this.resolvePath(leftPath)
        const two = this.resolvePath(rightPath)
        const parent = this.resolvePath(path)

        const oneObject = one.get("object")
        const twoObject = two.get("object")
        if (oneObject !== twoObject) {
            throw new Error(`Tried to merge two nodes of different objects: "${oneObject}" and "${twoObject}".`)
        } else if (oneObject === "text") {
            const characters = one.get("characters")
            characters.insert(characters.length, two.get("characters").toString())
        } else {
            one.get("nodes").push(two.get("nodes").toArray())
        }

        parent.get("nodes").delete(index)

        // TODO: handle selection updates
    }
    move_node({path, newPath}) {
        const node = this.resolvePath(path)
        const oldIndex = path.pop()
        const parent = this.resolvePath(path)
        const newIndex = newPath.pop()

        parent.get("nodes").delete(oldIndex)

        let target
        if (newPath.every((x, i) => x === path[i]) && newPath.length === path.length) {
            target = parent
        } else if (path.every((x, i) => x === newPath[i]) && oldIndex < newPath[path.length]) {
            newPath[path.length]--
            target = this.resolvePath(newPath)
        } else {
            target = this.resolvePath(newPath)
        }

        target.get("nodes").insert(newIndex, [node])
    }
    remove_node({path, node}) {
        // I don't think the `node` property is real
        const index = path.pop()
        const target = this.resolvePath(path)
        target.get("nodes").delete(index, 1)

        // TODO: handle selection stuff
    }
    set_node({path, properties, node}) {
        // I don't think the `node` property is real
        const target = this.resolvePath(path)
        if (target.get("object") === "text") {
            if (properties.hasOwnProperty("characters")) {
                const {text} = Text.create(properties)
                const characters = target.get("characters")
                characters.delete(0, characters.length)
                characters.insert(0, text)
            }
        } else {
            if (properties.hasOwnProperty("data")) {
                target.set("data", properties.data)
            }
            if (properties.hasOwnProperty("type")) {
                target.set("type", properties.type)
            }
            if (properties.hasOwnProperty("nodes")) {
                target.set("nodes", this.Y.Array)
                const nodes = target.get("nodes")
                properties.nodes.forEach((node, index) => {
                    nodes.push([this.Y.Map])
                    this.copyNode(nodes.get(index), node)
                })
            }
        }
    }
    split_node({path, position}) {
        // console.log("started split node")
        const node = this.resolvePath(path)
        const index = path.pop()
        const parent = this.resolvePath(path)

        const object = node.get("object")
        const parentNodes = parent.get("nodes")
        // console.log(parentNodes.length, index)
        // console.log("parentNodes", parentNodes, parentNodes.toArray())
        parentNodes.insert(index + 1, [this.Y.Map])
        const target = parentNodes.get(index + 1)
        target.set("object", object)
        if (object === "text") {
            target.set("characters", this.Y.Text)
            const characters = node.get("characters")
            // console.log(characters.length, position)
            target.get("characters").insert(0, characters.toString().slice(position))
            characters.delete(position, characters.length - position)
        } else {
            target.set("nodes", this.Y.Array)
            target.set("type", node.get("type"))
            const nodes = node.get("nodes")
            // console.log(nodes.length, position)
            const left = nodes.toArray().slice(position)
            // console.log("left", left)
            target.get("nodes").insert(0, nodes.toArray().slice(position))
            nodes.delete(position, nodes.length - position)
        }
        // console.log("target", target, target.map)
        // console.log("finished split node")
        // TODO: handle selection stuff
    }
}

// const APPLIERS = {
//
//     /**
//      * Add mark to text at `offset` and `length` in node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     add_mark(value, operation) {
//         const { path, offset, length, mark } = operation
//         let { document } = value
//         let node = document.assertPath(path)
//         node = node.addMark(offset, length, mark)
//         document = document.updateNode(node)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Insert a `node` at `index` in a node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     insert_node(value, operation) {
//         const { path, node } = operation
//         const index = path[path.length - 1]
//         const rest = path.slice(0, -1)
//         let { document } = value
//         let parent = document.assertPath(rest)
//         parent = parent.insertNode(index, node)
//         document = document.updateNode(parent)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Insert `text` at `offset` in node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     insert_text(value, operation) {
//         const { path, offset, text, marks } = operation
//         let { document, selection } = value
//         const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
//         let node = document.assertPath(path)
//
//         // Update the document
//         node = node.insertText(offset, text, marks)
//         document = document.updateNode(node)
//
//         // Update the selection
//         if (anchorKey == node.key && anchorOffset >= offset) {
//             selection = selection.moveAnchor(text.length)
//         }
//         if (focusKey == node.key && focusOffset >= offset) {
//             selection = selection.moveFocus(text.length)
//         }
//
//         value = value.set('document', document).set('selection', selection)
//         return value
//     },
//
//     /**
//      * Merge a node at `path` with the previous node.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     merge_node(value, operation) {
//         const { path } = operation
//         const withPath = path.slice(0, path.length - 1).concat([path[path.length - 1] - 1])
//         let { document, selection } = value
//         const one = document.assertPath(withPath)
//         const two = document.assertPath(path)
//         let parent = document.getParent(one.key)
//         const oneIndex = parent.nodes.indexOf(one)
//         const twoIndex = parent.nodes.indexOf(two)
//
//         // Perform the merge in the document.
//         parent = parent.mergeNode(oneIndex, twoIndex)
//         document = document.updateNode(parent)
//
//         // If the nodes are text nodes and the selection is inside the second node
//         // update it to refer to the first node instead.
//         if (one.object == 'text') {
//             const { anchorKey, anchorOffset, focusKey, focusOffset } = selection
//             let normalize = false
//
//             if (anchorKey == two.key) {
//                 selection = selection.moveAnchorTo(one.key, one.text.length + anchorOffset)
//                 normalize = true
//             }
//
//             if (focusKey == two.key) {
//                 selection = selection.moveFocusTo(one.key, one.text.length + focusOffset)
//                 normalize = true
//             }
//
//             if (normalize) {
//                 selection = selection.normalize(document)
//             }
//         }
//
//         // Update the document and selection.
//         value = value.set('document', document).set('selection', selection)
//         return value
//     },
//
//     /**
//      * Move a node by `path` to `newPath`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     move_node(value, operation) {
//         const { path, newPath } = operation
//         const newIndex = newPath[newPath.length - 1]
//         const newParentPath = newPath.slice(0, -1)
//         const oldParentPath = path.slice(0, -1)
//         const oldIndex = path[path.length - 1]
//         let { document } = value
//         const node = document.assertPath(path)
//
//         // Remove the node from its current parent.
//         let parent = document.getParent(node.key)
//         parent = parent.removeNode(oldIndex)
//         document = document.updateNode(parent)
//
//         // Find the new target...
//         let target
//
//         // If the old path and the rest of the new path are the same, then the new
//         // target is the old parent.
//         if (
//             (oldParentPath.every((x, i) => x === newParentPath[i])) &&
//             (oldParentPath.length === newParentPath.length)
//         ) {
//             target = parent
//         }
//
//         // Otherwise, if the old path removal resulted in the new path being no longer
//         // correct, we need to decrement the new path at the old path's last index.
//         else if (
//             (oldParentPath.every((x, i) => x === newParentPath[i])) &&
//             (oldIndex < newParentPath[oldParentPath.length])
//         ) {
//             newParentPath[oldParentPath.length]--
//             target = document.assertPath(newParentPath)
//         }
//
//         // Otherwise, we can just grab the target normally...
//         else {
//             target = document.assertPath(newParentPath)
//         }
//
//         // Insert the new node to its new parent.
//         target = target.insertNode(newIndex, node)
//         document = document.updateNode(target)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Remove mark from text at `offset` and `length` in node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     remove_mark(value, operation) {
//         const { path, offset, length, mark } = operation
//         let { document } = value
//         let node = document.assertPath(path)
//         node = node.removeMark(offset, length, mark)
//         document = document.updateNode(node)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Remove a node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     remove_node(value, operation) {
//         const { path } = operation
//         let { document, selection } = value
//         const { startKey, endKey } = selection
//         const node = document.assertPath(path)
//
//         // If the selection is set, check to see if it needs to be updated.
//         if (selection.isSet) {
//             const hasStartNode = node.hasNode(startKey)
//             const hasEndNode = node.hasNode(endKey)
//             const first = node.object == 'text' ? node : node.getFirstText() || node
//             const last = node.object == 'text' ? node : node.getLastText() || node
//             const prev = document.getPreviousText(first.key)
//             const next = document.getNextText(last.key)
//
//             // If the start point was in this node, update it to be just before/after.
//             if (hasStartNode) {
//                 if (prev) {
//                     selection = selection.moveStartTo(prev.key, prev.text.length)
//                 } else if (next) {
//                     selection = selection.moveStartTo(next.key, 0)
//                 } else {
//                     selection = selection.deselect()
//                 }
//             }
//
//             // If the end point was in this node, update it to be just before/after.
//             if (selection.isSet && hasEndNode) {
//                 if (prev) {
//                     selection = selection.moveEndTo(prev.key, prev.text.length)
//                 } else if (next) {
//                     selection = selection.moveEndTo(next.key, 0)
//                 } else {
//                     selection = selection.deselect()
//                 }
//             }
//
//             // If the selection wasn't deselected, normalize it.
//             if (selection.isSet) {
//                 selection = selection.normalize(document)
//             }
//         }
//
//         // Remove the node from the document.
//         let parent = document.getParent(node.key)
//         const index = parent.nodes.indexOf(node)
//         parent = parent.removeNode(index)
//         document = document.updateNode(parent)
//
//         // Update the document and selection.
//         value = value.set('document', document).set('selection', selection)
//         return value
//     },
//
//     /**
//      * Remove `text` at `offset` in node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     remove_text(value, operation) {
//         const { path, offset, text } = operation
//         const { length } = text
//         const rangeOffset = offset + length
//         let { document, selection } = value
//         const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
//         let node = document.assertPath(path)
//
//         if (anchorKey == node.key) {
//             if (anchorOffset >= rangeOffset) {
//                 selection = selection.moveAnchor(-length)
//             } else if (anchorOffset > offset) {
//                 selection = selection.moveAnchorTo(anchorKey, offset)
//             }
//         }
//
//         if (focusKey == node.key) {
//             if (focusOffset >= rangeOffset) {
//                 selection = selection.moveFocus(-length)
//             } else if (focusOffset > offset) {
//                 selection = selection.moveFocusTo(focusKey, offset)
//             }
//         }
//
//         node = node.removeText(offset, length)
//         document = document.updateNode(node)
//         value = value.set('document', document).set('selection', selection)
//         return value
//     },
//
//     /**
//      * Set `properties` on mark on text at `offset` and `length` in node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     set_mark(value, operation) {
//         const { path, offset, length, mark, properties } = operation
//         let { document } = value
//         let node = document.assertPath(path)
//         node = node.updateMark(offset, length, mark, properties)
//         document = document.updateNode(node)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Set `properties` on a node by `path`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     set_node(value, operation) {
//         const { path, properties } = operation
//         let { document } = value
//         let node = document.assertPath(path)
//         node = node.merge(properties)
//         document = document.updateNode(node)
//         value = value.set('document', document)
//         return value
//     },
//
//     /**
//      * Set `properties` on the selection.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     set_selection(value, operation) {
//         const { properties } = operation
//         const { anchorPath, focusPath, ...props } = properties
//         let { document, selection } = value
//
//         if (anchorPath !== undefined) {
//             props.anchorKey = anchorPath === null ? null : document.assertPath(anchorPath).key
//         }
//
//         if (focusPath !== undefined) {
//             props.focusKey = focusPath === null ? null : document.assertPath(focusPath).key
//         }
//
//         selection = selection.merge(props)
//         selection = selection.normalize(document)
//         value = value.set('selection', selection)
//         return value
//     },
//
//     /**
//      * Set `properties` on `value`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     set_value(value, operation) {
//         const { properties } = operation
//         value = value.merge(properties)
//         return value
//     },
//
//     /**
//      * Split a node by `path` at `offset`.
//      *
//      * @param {Value} value
//      * @param {Operation} operation
//      * @return {Value}
//      */
//
//     split_node(value, operation) {
//         const { path, position } = operation
//         let { document, selection } = value
//
//         // Calculate a few things...
//         const node = document.assertPath(path)
//         let parent = document.getParent(node.key)
//         const index = parent.nodes.indexOf(node)
//
//         // Split the node by its parent.
//         parent = parent.splitNode(index, position)
//         document = document.updateNode(parent)
//
//         // Determine whether we need to update the selection...
//         const { startKey, endKey, startOffset, endOffset } = selection
//         const next = document.getNextText(node.key)
//         let normalize = false
//
//         // If the start point is after or equal to the split, update it.
//         if (node.key == startKey && position <= startOffset) {
//             selection = selection.moveStartTo(next.key, startOffset - position)
//             normalize = true
//         }
//
//         // If the end point is after or equal to the split, update it.
//         if (node.key == endKey && position <= endOffset) {
//             selection = selection.moveEndTo(next.key, endOffset - position)
//             normalize = true
//         }
//
//         // Normalize the selection if we changed it, since the methods we use might
//         // leave it in a non-normalized value.
//         if (normalize) {
//             selection = selection.normalize(document)
//         }
//
//         // Return the updated value.
//         value = value.set('document', document).set('selection', selection)
//         return value
//     },
//
// }
