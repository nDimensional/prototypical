import { Y, set, insert, createArray, createMap, createText, isText } from "./y"
import { Text, Operation } from "slate"
import { resolve } from "path"
import { Map } from "immutable"

// Utils
export function walk(node, y) {
	const { object } = node
	if (object === "text") {
		const text = createText(y, node.text)
		text.key = node.key
		return text
	} else {
		const { data, nodes } = node
		const children = Array.from(nodes).map(node => walk(node, y))
		const properties = {
			object,
			data: data.toJS(),
			nodes: createArray(y, children),
		}
		if (object === "block" || object === "inline") {
			const { isVoid, type } = node
			properties.isVoid = isVoid
			properties.type = type
		}
		const map = createMap(y, properties)
		map.key = node.key
		return map
	}
}

window.walk = walk

function resolvePath(y, path) {
	return path.reduce(
		(root, index) => root.get("nodes").get(index),
		y.share.value.get("document")
	)
}

function clone(node, y) {
	if (isText(node)) {
		const text = createText(y, node.toString())
		text.key = node.key
		return text
	} else {
		const object = node.get("object")
		const data = node.get("data")
		const children = node
			.get("nodes")
			.toArray()
			.map(node => clone(node, y))
		const properties = {
			object,
			data,
			nodes: createArray(y, children),
		}
		if (object === "block" || object === "inline") {
			properties.isVoid = node.get("isVoid")
			properties.type = node.get("type")
		}
		const map = createMap(y, properties)
		map.key = node.key
		return map
	}
}

export function updateSelectionRemove(selection, document, node) {
	// If the selection is set, check to see if it needs to be updated.
	const { startKey, endKey } = selection
	if (selection.isSet) {
		const hasStartNode = node.hasNode(startKey)
		const hasEndNode = node.hasNode(endKey)
		const first = node.object == "text" ? node : node.getFirstText() || node
		const last = node.object == "text" ? node : node.getLastText() || node
		const prev = document.getPreviousText(first.key)
		const next = document.getNextText(last.key)

		// If the start point was in this node, update it to be just before/after.
		if (hasStartNode) {
			if (prev) {
				selection = selection.moveStartTo(prev.key, prev.text.length)
			} else if (next) {
				selection = selection.moveStartTo(next.key, 0)
			} else {
				selection = selection.deselect()
			}
		}

		// If the end point was in this node, update it to be just before/after.
		if (selection.isSet && hasEndNode) {
			if (prev) {
				selection = selection.moveEndTo(prev.key, prev.text.length)
			} else if (next) {
				selection = selection.moveEndTo(next.key, 0)
			} else {
				selection = selection.deselect()
			}
		}

		// If the selection wasn't deselected, normalize it.
		if (selection.isSet) {
			selection = selection.normalize(document)
		}
	}
	return selection
}

// Appliers
const appliers = {
	/**
	 * Add mark to text at `offset` and `length` in node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	add_mark(value, operation, pool, remote) {
		const { path, offset, length, mark } = operation
		let { document } = value
		let node = document.assertPath(path)
		node = node.addMark(offset, length, mark)
		document = document.updateNode(node)
		value = value.set("document", document)
		return value
	},

	/**
	 * Insert a `node` at `index` in a node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	insert_node(value, operation, y) {
		const { path, node } = operation
		const index = path[path.length - 1]
		const rest = path.slice(0, -1)

		let { document } = value
		let parent = document.assertPath(rest)
		parent = parent.insertNode(index, node)
		document = document.updateNode(parent)
		value = value.set("document", document)

		const yNode = walk(node, y)
		const yParent = resolvePath(y, rest)
		insert(yParent.get("nodes"), index, [yNode])

		return value
	},

	/**
	 * Insert `text` at `offset` in node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	insert_text(value, operation, y) {
		const { path, offset, text, marks } = operation
		let { document, selection } = value
		const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
		let node = document.assertPath(path)

		// Update the document
		node = node.insertText(offset, text, marks)
		document = document.updateNode(node)

		const yNode = resolvePath(y, path)
		yNode.insert(offset, text)

		// Update the selection
		if (anchorKey == node.key && anchorOffset >= offset) {
			selection = selection.moveAnchor(text.length)
		}
		if (focusKey == node.key && focusOffset >= offset) {
			selection = selection.moveFocus(text.length)
		}

		value = value.set("document", document).set("selection", selection)
		return value
	},

	/**
	 * Merge a node at `path` with the previous node.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	merge_node(value, operation, y) {
		const { path } = operation
		const withPath = path
			.slice(0, path.length - 1)
			.concat([path[path.length - 1] - 1])
		let { document, selection } = value
		const one = document.assertPath(withPath)
		const two = document.assertPath(path)
		let parent = document.getParent(one.key)
		const oneIndex = parent.nodes.indexOf(one)
		const twoIndex = parent.nodes.indexOf(two)

		// Perform the merge in the document.
		parent = parent.mergeNode(oneIndex, twoIndex)
		document = document.updateNode(parent)

		const yParent = resolvePath(y, path.slice(0, -1))
		const yOne = resolvePath(y, withPath)
		const yTwo = resolvePath(y, path)
		if (Text.isText(one) && Text.isText(two)) {
			yOne.insert(yOne.length, yTwo.toString())
		} else {
			const oneNodes = yOne.get("nodes")
			const twoNodes = yTwo.get("nodes")
			insert(
				oneNodes,
				oneNodes.length,
				twoNodes.toArray().map(node => clone(node, y))
			)
		}
		yParent.get("nodes").delete(twoIndex)

		// If the nodes are text nodes and the selection is inside the second node
		// update it to refer to the first node instead.
		if (one.object == "text") {
			const { anchorKey, anchorOffset, focusKey, focusOffset } = selection
			let normalize = false

			if (anchorKey == two.key) {
				selection = selection.moveAnchorTo(
					one.key,
					one.text.length + anchorOffset
				)
				normalize = true
			}

			if (focusKey == two.key) {
				selection = selection.moveFocusTo(
					one.key,
					one.text.length + focusOffset
				)
				normalize = true
			}

			if (normalize) {
				selection = selection.normalize(document)
			}
		}

		// Update the document and selection.
		value = value.set("document", document).set("selection", selection)
		return value
	},

	/**
	 * Move a node by `path` to `newPath`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	move_node(value, operation, y) {
		const { path, newPath } = operation
		const newIndex = newPath[newPath.length - 1]
		const newParentPath = newPath.slice(0, -1)
		const oldParentPath = path.slice(0, -1)
		const oldIndex = path[path.length - 1]
		let { document } = value
		const node = document.assertPath(path)

		// Remove the node from its current parent.
		let parent = document.getParent(node.key)
		parent = parent.removeNode(oldIndex)
		document = document.updateNode(parent)

		const yParent = resolvePath(y, oldParentPath)
		const yNode = resolvePath(y, path)
		const yClone = clone(yNode, y)
		yParent.get("nodes").delete(oldIndex)

		// Find the new target...
		let target
		let yTarget

		// If the old path and the rest of the new path are the same, then the new
		// target is the old parent.
		if (
			oldParentPath.every((x, i) => x === newParentPath[i]) &&
			oldParentPath.length === newParentPath.length
		) {
			target = parent
			yTarget = yParent
		} else if (
			oldParentPath.every((x, i) => x === newParentPath[i]) &&
			oldIndex < newParentPath[oldParentPath.length]
		) {
			// Otherwise, if the old path removal resulted in the new path being no longer
			// correct, we need to decrement the new path at the old path's last index.
			newParentPath[oldParentPath.length]--
			target = document.assertPath(newParentPath)
			yTarget = resolvePath(y, newParentPath)
		} else {
			// Otherwise, we can just grab the target normally...
			target = document.assertPath(newParentPath)
			yTarget = resolvePath(y, newParentPath)
		}

		// Insert the new node to its new parent.
		target = target.insertNode(newIndex, node)
		document = document.updateNode(target)
		value = value.set("document", document)

		insert(yTarget.get("nodes"), newIndex, [yClone])

		return value
	},

	/**
	 * Remove mark from text at `offset` and `length` in node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	remove_mark(value, operation) {
		const { path, offset, length, mark } = operation
		let { document } = value
		let node = document.assertPath(path)
		node = node.removeMark(offset, length, mark)
		document = document.updateNode(node)
		value = value.set("document", document)
		return value
	},

	/**
	 * Remove a node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	remove_node(value, operation, y) {
		const { path } = operation
		let { document, selection } = value
		const node = document.assertPath(path)

		selection = updateSelectionRemove(selection, document, node)

		// Remove the node from the document.
		let parent = document.getParent(node.key)
		const index = parent.nodes.indexOf(node)
		parent = parent.removeNode(index)
		document = document.updateNode(parent)

		const yParent = resolvePath(y, path.slice(0, -1))
		yParent.get("nodes").delete(index)

		// Update the document and selection.
		value = value.set("document", document).set("selection", selection)
		return value
	},

	/**
	 * Remove `text` at `offset` in node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	remove_text(value, operation, y) {
		const { path, offset, text } = operation
		const { length } = text
		const rangeOffset = offset + length
		let { document, selection } = value
		const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
		let node = document.assertPath(path)

		if (anchorKey == node.key) {
			if (anchorOffset >= rangeOffset) {
				selection = selection.moveAnchor(-length)
			} else if (anchorOffset > offset) {
				selection = selection.moveAnchorTo(anchorKey, offset)
			}
		}

		if (focusKey == node.key) {
			if (focusOffset >= rangeOffset) {
				selection = selection.moveFocus(-length)
			} else if (focusOffset > offset) {
				selection = selection.moveFocusTo(focusKey, offset)
			}
		}

		node = node.removeText(offset, length)
		document = document.updateNode(node)
		value = value.set("document", document).set("selection", selection)

		const yNode = resolvePath(y, path)
		yNode.delete(offset, text.length)

		return value
	},

	/**
	 * Set `properties` on mark on text at `offset` and `length` in node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	set_mark(value, operation) {
		const { path, offset, length, mark, properties } = operation
		let { document } = value
		let node = document.assertPath(path)
		node = node.updateMark(offset, length, mark, properties)
		document = document.updateNode(node)
		value = value.set("document", document)
		return value
	},

	/**
	 * Set `properties` on a node by `path`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	set_node(value, operation) {
		const { path, properties } = operation
		let { document } = value
		let node = document.assertPath(path)
		node = node.merge(properties)
		document = document.updateNode(node)
		value = value.set("document", document)

		const yNode = resolvePath(y, path)
		const props = properties
		Object.keys(props).forEach(key => {
			if (Map.isMap(props[key])) {
				yNode.set(key, props[key].toJS())
			} else {
				yNode.set(key, props[key])
			}
		})
		return value
	},

	/**
	 * Set `properties` on the selection.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	set_selection(value, operation) {
		const { properties } = operation
		const { anchorPath, focusPath, ...props } = properties
		let { document, selection } = value

		if (anchorPath !== undefined) {
			props.anchorKey =
				anchorPath === null ? null : document.assertPath(anchorPath).key
		}

		if (focusPath !== undefined) {
			props.focusKey =
				focusPath === null ? null : document.assertPath(focusPath).key
		}

		selection = selection.merge(props)
		selection = selection.normalize(document)
		value = value.set("selection", selection)
		return value
	},

	/**
	 * Set `properties` on `value`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	set_value(value, operation) {
		const { properties } = operation
		value = value.merge(properties)
		return value
	},

	/**
	 * Split a node by `path` at `offset`.
	 *
	 * @param {Value} value
	 * @param {Operation} operation
	 * @return {Value}
	 */

	split_node(value, operation, y) {
		const { path, position, properties } = operation
		let { document, selection } = value

		// Calculate a few things...
		const node = document.assertPath(path)
		let parent = document.getParent(node.key)
		const index = parent.nodes.indexOf(node)

		// Split the node by its parent.
		parent = parent.splitNode(index, position)
		let splitNode = parent.nodes.get(index + 1)
		if (properties && splitNode.object !== "text") {
			splitNode = splitNode.merge(properties)
			parent = parent.updateNode(splitNode)
		}
		document = document.updateNode(parent)

		const yNode = resolvePath(y, path)
		const yParent = resolvePath(y, path.slice(0, -1))
		if (isText(yNode)) {
			const text = createText(y, yNode.toString().slice(position))
			yNode.delete(position, yNode.length - position)
			insert(yParent.get("nodes"), index + 1, [text])
		} else {
			const nodes = yNode.get("nodes")
			const props = properties || {}
			props.object = yNode.get("object")
			props.data = props.data || {}
			const data = yNode.get("data")
			if (props.data) {
				Object.keys(props.data).forEach(key => (data[key] = props.data[key]))
			}
			props.data = data
			if (props.object === "block" || props.object === "inline") {
				props.type = props.type || yNode.get("type")
				props.isVoid = props.isVoid || yNode.get("isVoid")
			}
			props.nodes = createArray(
				y,
				nodes
					.toArray()
					.slice(position)
					.map(node => clone(node, y))
			)
			const map = createMap(y, props)
			nodes.delete(position, nodes.length - position)
			insert(yParent.get("nodes"), index + 1, [map])
		}

		// Determine whether we need to update the selection...
		const { startKey, endKey, startOffset, endOffset } = selection
		const next = document.getNextText(node.key)
		let normalize = false

		// If the start point is after or equal to the split, update it.
		if (node.key == startKey && position <= startOffset) {
			selection = selection.moveStartTo(next.key, startOffset - position)
			normalize = true
		}

		// If the end point is after or equal to the split, update it.
		if (node.key == endKey && position <= endOffset) {
			selection = selection.moveEndTo(next.key, endOffset - position)
			normalize = true
		}

		// Normalize the selection if we changed it, since the methods we use might
		// leave it in a non-normalized value.
		if (normalize) {
			selection = selection.normalize(document)
		}

		// Return the updated value.
		value = value.set("document", document).set("selection", selection)
		return value
	},
}

/**
 * Apply an `operation` to a `value`.
 *
 * @param {Value} value
 * @param {Object|Operation} operation
 * @return {Value} value
 */

function applyOperation(value, operation, y) {
	operation = Operation.create(operation)
	const { type } = operation
	if (appliers.hasOwnProperty(type)) {
		return appliers[type](value, operation, y)
	} else {
		throw new Error(`Unknown operation type: "${type}".`)
	}
}

/**
 * Export.
 *
 * @type {Function}
 */

export default applyOperation
