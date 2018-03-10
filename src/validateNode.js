import { Map, is } from "immutable"
import { Range } from "slate"
import {
	paragraphType,
	imageType,
	documentType,
	documentTest,
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
	if (block.type === documentType) {
		return block.nodes.get(0).text
	} else {
		return block.text
	}
}

function getBlockData(type, text, data) {
	if (type === imageType) {
		const [match, alt, src] = blockTests.img.exec(text)
		return Map({ alt, src })
	} else if (type === documentType) {
		const [match, prefix, name, path] = documentTest.exec(text)
		const depth = prefix.length
		return Map({ name, path, depth })
	} else if (headingTypes.includes(type)) {
		return data || Map({})
	} else {
		return Map({})
	}
}

function transitionFromList(change, block, type) {
	if (change.flags.enter) {
		// This is the tail end of the hack in editor.jsx
		const text = block.getFirstText()
		change.insertTextByKey(text.key, 0, prefixes[block.type] + " ")
	} else {
		change.withoutNormalization(change =>
			change.unwrapNodeByKey(block.key).setNodeByKey(block.key, type)
		)
	}
}

function transitionToList(change, block, type) {
	change.withoutNormalization(change =>
		change
			.wrapBlockByKey(block.key, type)
			.setNodeByKey(block.key, listItemMap[type])
	)
}

function validateBlock(block, editor) {
	if (listTypes.includes(block.type)) {
		return
	}

	const text = getBlockText(block)
	const type = getBlockType(text)

	const fromDocument = block.type === documentType
	const toDocument = documentTest.test(text)

	const fromList = listItemTypes.includes(block.type)
	const toList = listTypes.includes(type)

	// Handle transitions to & from documents first.
	if (toDocument && fromDocument) {
		// update document
		const data = getBlockData(documentType, text, block.data)
		if (!is(data, block.data)) {
			return change => change.setNodeByKey(block.key, { data })
		}
	} else if (
		toDocument &&
		headingTypes.includes(block.type) &&
		!block.data.get("header")
	) {
		// {h} --> document
		const data = getBlockData(documentType, text)
		return change =>
			change.withoutNormalization(change => {
				const next = change.value.document.getNextSibling(block.key)
				const headless =
					next &&
					next.type === documentType &&
					!(next.nodes.size && next.nodes.get(0).data.get("header"))
				if (headless) {
					change.setNodeByKey(block.key, { data: Map({ header: true }) })
					change.moveNodeByKey(block.key, next.key, 0)
				} else {
					const parent = change.value.document.getParent(block.key)
					change.setNodeByKey(block.key, { data: Map({ header: true }) })
					change.wrapBlockByKey(block.key, { type: documentType, data })
					editor.attach(data)
				}
			})
	} else if (fromDocument) {
		// document --> {h}
		const headerKey = block.nodes.get(0).key
		return change =>
			change.withoutNormalization(change => {
				const parent = change.value.document.getParent(block.key)
				const index = parent.nodes.indexOf(block)
				const previous = parent.nodes.get()
				const sibling = change.value.document.getPreviousSibling(block.key)
				if (
					sibling &&
					headingTypes.includes(sibling.type) &&
					sibling.data.get("header")
				) {
					change.moveNodeByKey(sibling.key, block.key, 0)
				} else {
					change.unwrapNodeByKey(headerKey)
					change.setNodeByKey(headerKey, { data: Map({}) })
					if (change.value.document.hasDescendant(block.key)) {
						change.removeNodeByKey(block.key)
					}
				}
			})
	} else if (
		headingTypes.includes(block.type) &&
		block.data.get("header") &&
		!toDocument
	) {
		return change => {
			const next = change.value.document.getNextSibling(block.key)
			if (
				next &&
				headingTypes.includes(next.type) &&
				next.data.get("header") &&
				!next.isEmpty
			) {
				const parent = change.value.document.getParent(block.key)
				if (parent.type === documentType) {
					const grandparent = change.value.document.getParent(parent.key)
					const index = grandparent.nodes.indexOf(parent)
					if (documentTest.test(next.text)) {
						return change.moveNodeByKey(block.key, grandparent.key, index)
					} else {
						return change.withoutNormalization(change => {
							const data = getBlockData(type, text, block.data)
							const nextText = getBlockText(next)
							const nextType = getBlockType(nextText)
							const nextData = getBlockData(nextType, nextText, next.data)
							change
								.moveNodeByKey(block.key, grandparent.key, index)
								.moveNodeByKey(next.key, grandparent.key, index + 1)
								.setNodeByKey(block.key, { type, data })
								.setNodeByKey(next.key, { type: nextType, data: nextData })
							if (change.value.document.hasDescendant(parent.key)) {
								change.removeNodeByKey(parent.key)
							}
						})
					}
				}
			}
			const data = getBlockData(type, text)
			return change.setNodeByKey(block.key, { type, data })
		}
	} else if (listItemMap[type] === block.type) {
		return
	} else if (block.type === type) {
		const data = getBlockData(block.type, text, block.data)
		if (data.size > 0 && !is(data, block.data)) {
			return change => change.setNodeByKey(block.key, { data })
		}
	} else if (fromList && toList) {
		// list --> list
		// TODO: Understand why this works.
	} else if (fromList) {
		// list --> {p|h|img}
		return change => transitionFromList(change, block, type)
	} else if (toList) {
		// {p|h|img} --> list
		return change => transitionToList(change, block, type)
	} else {
		// {p|h|img} --> {p|h|img}
		const data = getBlockData(type, text, block.data)
		return change => change.setNodeByKey(block.key, { type, data })
	}
}

function validateDocument(document) {
	const mergers = []
	const childChanges = []
	const last = document.nodes.reduce((array, block, index) => {
		// Normal stuff
		if (block.type === documentType) {
			const changes = validateDocument(block)
			if (changes) {
				childChanges.push(changes)
			}
		} else if (
			(document.object === "document" || index > 0) &&
			headingTypes.includes(block.type) &&
			block.data.get("header")
		) {
			const text = getBlockText(block)
			if (documentTest.test(text)) {
				const data = getBlockData(documentType, text)
				childChanges.push(change =>
					change.wrapBlockByKey(block.key, { type: documentType, data })
				)
			}
		}

		// List stuff
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
			childChanges.forEach(changes => changes(change))
		}
	} else if (childChanges.length > 0) {
		return change => childChanges.forEach(changes => changes(change))
	}
}

export default function validateNode(node, editor) {
	if (node.object === "document") {
		return validateDocument(node)
	} else if (node.object === "block") {
		return validateBlock(node, editor)
	}
}
