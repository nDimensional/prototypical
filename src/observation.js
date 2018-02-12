import { isText, isMap, isArray, isType } from "./y"
import { Map } from "immutable"
import { Text, Block, Inline, Document, Character } from "slate"
import { updateSelectionRemove } from "./operation"

const constructorMap = {
	block: Block,
	inline: Inline,
	document: Document,
	text: Text,
}

export function spawn(y) {
	if (isText(y)) {
		const text = Text.create({ text: y.toString() })
		y.key = text.key
		return text
	} else if (isMap(y)) {
		const object = y.get("object")
		const data = y.get("data")
		const nodes = y
			.get("nodes")
			.toArray()
			.map(spawn)
		const properties = { object, data, nodes }
		if (object === "block" || object === "inline") {
			properties.type = y.get("type")
			properties.isVoid = y.get("isVoid")
		}
		const node = constructorMap[object].create(properties)
		y.key = node.key
		return node
	}
}

export default function applyObservation(event, value) {
	const { type, path, object } = event
	let { selection, document } = value
	const nodePath = path.slice(1).filter((n, i) => i % 2 === 1)
	const node = nodePath.reduce((root, index) => root.nodes.get(index), document)
	if (isText(object)) {
		let { anchorKey, anchorOffset, focusKey, focusOffset } = selection
		const { index, length, values } = event
		const inserted = Character.createList(type === "insert" ? values : [])
		const deleted = type === "insert" ? 0 : length
		const args = [index, deleted, ...inserted]
		const characters = node.characters.splice.apply(node.characters, args)
		if (anchorKey === node.key && anchorOffset >= index) {
			anchorOffset += inserted.size - deleted
		}
		if (focusKey === node.key && focusOffset >= index) {
			focusOffset += inserted.size - deleted
		}
		document = document.updateNode(node.set("characters", characters))
		selection = selection
			.set("anchorOffset", anchorOffset)
			.set("focusOffset", focusOffset)
	} else if (isArray(object)) {
		const { index, length, values } = event
		const inserted = type === "insert" ? values.map(spawn) : []
		const deleted = type === "insert" ? 0 : length
		const args = [index, deleted, ...inserted]
		const nodes = node.nodes.splice.apply(node.nodes, args)
		if (type === "delete") {
			selection = node.nodes
				.slice(index, index + length)
				.reduce(
					(selection, node) => updateSelectionRemove(selection, document, node),
					selection
				)
		}
		document = document.updateNode(node.set("nodes", nodes))
	} else if (isMap(object)) {
		const { name, value } = event
		if (type === "add" || type === "update") {
			if (path.length === 0 && name === "document") {
				document = spawn(value)
			} else {
				const v = isType(value)
					? spawn(value)
					: name === "data" ? Map(value) : value
				document = document.updateNode(node.set(name, v))
			}
		} else if (type === "delete") {
			document = document.updateNode(node.delete(key))
		}
	}
	return value.set("document", document).set("selection", selection)
}
