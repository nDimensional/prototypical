import { Map, is } from "immutable"
import { Range } from "slate"
import {
	paragraphType,
	blockTests,
	headingTypes,
	listTypes,
	listItemMap,
	listItemTypes,
	prefixes,
} from "./schema.js"
import { tag } from "./utils"

function getBlockType(text) {
	const keys = Object.keys(blockTests)
	const type = keys.find(key => blockTests[key].test(text))
	return type || paragraphType
}

function getBlockText(block) {
	return block.text
}

function getBlockData(type, text) {
	if (type === "img") {
		const [match, alt, src] = blockTests.img.exec(text)
		return Map({ alt, src })
	} else {
		return null
	}
}

function validateBlock(block) {
	if (listTypes.includes(block.type)) {
		return
	}
	const text = getBlockText(block)
	const type = getBlockType(text)

	const fromList = listItemTypes.includes(block.type)
	const toList = listTypes.includes(type)

	if (listItemMap[type] === block.type) {
		return
	} else if (block.type === type) {
		const data = getBlockData(block.type, text)
		if (data && data.size > 0 && !is(data, block.data)) {
			return change => change.setNodeByKey(block.key, { data })
		}
	} else if (fromList && toList) {
		// list --> list
	} else if (fromList) {
		// list --> {p|h|img}
		return change => {
			if (change.flags.enter) {
				const text = block.getFirstText()
				change.insertTextByKey(text.key, 0, prefixes[block.type] + " ")
			} else {
				change.withoutNormalization(change =>
					change.unwrapNodeByKey(block.key).setNodeByKey(block.key, type)
				)
			}
		}
	} else if (toList) {
		// {p|h|img} --> list
		return change =>
			change.withoutNormalization(change =>
				change
					.wrapBlockByKey(block.key, type)
					.setNodeByKey(block.key, listItemMap[type])
			)
	} else if (type === "img") {
		// {p|h} --> {img}
		const data = getBlockData(type, text)
		return change => change.setNodeByKey(block.key, { type, data })
	} else {
		// {p|h|img} --> {p|h}
		return change => change.setNodeByKey(block.key, { type })
	}
}

function validateDocument(document) {
	const mergers = []
	const last = document.nodes.reduce((array, block) => {
		if (array === null) {
			if (block.type === "blockquote") {
				return [block.key]
			} else {
				return null
			}
		} else {
			if (block.type === "blockquote") {
				array.push(block.key)
				return array
			} else {
				if (array.length > 1) {
					mergers.push(array)
				}
				return null
			}
		}
	}, null)
	if (last !== null && last.length > 1) {
		mergers.push(last)
	}
	if (mergers.length > 0) {
		return change => {
			mergers.forEach(array => {
				const start = change.value.document.getFirstText(array[0])
				const end = change.value.document.getLastText(array[array.length - 1])
				const range = Range.create({ anchorKey: start.key, focusKey: end.key })

				change.withoutNormalization(change => {
					change.wrapBlockAtRange(range, "blockquote")
					array.forEach(key =>
						change.value.document
							.getDescendant(key)
							.nodes.forEach(text => change.unwrapNodeByKey(text.key))
					)
				})
			})
		}
	}
}

export default function validateNode(node) {
	if (node.object === "document") {
		return validateDocument(node)
	} else if (node.object === "block") {
		return validateBlock(node)
	}
}
