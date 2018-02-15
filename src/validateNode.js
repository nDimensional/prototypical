import { Map, is } from "immutable"
import { defaultType, blockTests, createTextContent } from "./schema.js"
import { tag, headerTag, contentTag } from "./utils"

function getBlockType(text) {
	const type = Object.keys(blockTests).find(key => blockTests[key].test(text))
	return type || defaultType
}

function getBlockText(block) {
	if (block.type === tag) {
		return block.nodes.get(0).text
	}
	return block.text
}

function getBlockData(type, text) {
	if (type === "img") {
		const [match, alt, src] = blockTests.img.exec(text)
		return Map({ alt, src })
	} else if (type === tag) {
		const [match, prefix, name, path] = blockTests[tag].exec(text)
		const depth = prefix.length
		return Map({ depth, name, path })
	} else {
		return Map()
	}
}

function validateBlock(block, editor, ipfs) {
	if (block.type === headerTag || block.type === contentTag) {
		return
	}

	const text = getBlockText(block)
	const type = getBlockType(text)

	console.log("type", type)

	if (block.type === type) {
		const data = getBlockData(block.type, text)
		if (data.size > 0 && !is(data, block.data)) {
			return change => change.setNodeByKey(block.key, { data })
		}
	} else if (block.type === tag) {
		return transitionFromNode(type, text, block, editor, ipfs)
	} else if (type === tag) {
		return transitionToNode(type, text, block, editor, ipfs)
	} else if (type === "img") {
		// transition to img from header
		const data = getBlockData(type, text)
		return change => change.setNodeByKey(block.key, { type, data })
	} else {
		// transition to header from header or img
		return change => change.setNodeByKey(block.key, { type })
	}
}

function transitionFromNode(type, text, block, editor, ipfs) {
	const header = block.nodes.get(0)
	return change =>
		change.withoutNormalization(change => {
			const parent = change.value.document.getParent(block.key)
			const index = parent.nodes.indexOf(block)
			change
				.moveNodeByKey(header.key, parent.key, index)
				.setNodeByKey(header.key, { type })
				.removeNodeByKey(block.key)
		})
}

function transitionToNode(type, text, block, editor, ipfs) {
	// type === tag
	const data = getBlockData(type, text)
	const furthest = editor.value.document.getFurthest(
		block.key,
		node => node.type === tag
	)
	console.log("got furthest", furthest)
	return change =>
		change.withoutNormalization(change => {
			change.setNodeByKey(block.key, headerTag)
			change.wrapBlockByKey(block.key, { type, data })
			const parent = change.value.document.getParent(block.key)
			change.insertNodeByKey(parent.key, 1, createTextContent("foobar"))
		})
}

export default function validateNode(node, editor, root) {
	if (node.object === "block") {
		return validateBlock(node, editor, root)
	}
}
