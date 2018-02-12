import { Block } from "slate"
import { tag, headerTag, contentTag } from "./utils.js"

export const defaultType = "p"
export const headingTypes = ["h1", "h2", "h3", "blockquote"]
export const blockTypes = [defaultType, ...headingTypes, "img", tag]
export const markTypes = ["strong", "em", "u", "code", "a"]

export const pathTest = /[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{46}/
export const text = {
	// [tag]: /^@\[([^\[]*)]\(([^)]+)\)$/,
	img: /^!\[([^\[]*)]\(([^)]+)\)$/,
	h1: /^#($|[^#])/,
	h2: /^##($|[^#])/,
	h3: /^###($|[^#])/,
	blockquote: /^>($|[^>])/,
}

export const headings = {
	h1: "#",
	h2: "##",
	h3: "###",
	blockquote: ">",
}

const documentSchema = { nodes: [{ types: blockTypes, min: 1 }] }
const blockSchema = { nodes: [{ objects: ["text"] }] }

export function createText(content) {
	return {
		object: "text",
		leaves: [
			{
				object: "leaf",
				text: content || "",
				marks: [],
			},
		],
	}
}

export function createNode(data, nodes) {
	return {
		object: "block",
		data,
		type: tag,
		isVoid: false,
		nodes: [createHeader(data), createContent(nodes)],
	}
}

export function createHeader({ name, path }) {
	return {
		object: "block",
		type: headerTag,
		isVoid: false,
		nodes: [createText(`@[${name}](${path})`)],
	}
}

export function createContent(nodes) {
	return {
		object: "block",
		type: contentTag,
		data: {},
		isVoid: false,
		nodes,
	}
}

export const emptyText = createText("")

export const emptyBlock = {
	object: "block",
	type: defaultType,
	data: {},
	isVoid: false,
	nodes: [emptyText],
}

export const emptyHeader = {
	object: "block",
	type: headerTag,
	data: {},
	isVoid: false,
	nodes: [emptyText],
}

export const emptyContent = {
	object: "block",
	type: contentTag,
	data: {},
	isVoid: false,
	nodes: [emptyBlock],
}

const headingSchema = {}
headingTypes.forEach(headingType => (headingSchema[headingType] = blockSchema))

export default {
	document: documentSchema,
	blocks: {
		[defaultType]: blockSchema,
		...headingSchema,
		img: blockSchema,
		// 	[tag]: {
		// 		nodes: [
		// 			{ objects: ["block"], types: [headerTag], min: 1, max: 1 },
		// 			{ objects: ["block"], types: [contentTag], min: 1, max: 1 },
		// 		],
		// 		normalize(change, reason, context) {
		// 			if (reason === "child_object_invalid") {
		// 				const { node, rule, child, index } = context
		// 				if (child.object === "text" && index === 0) {
		// 					change.wrapBlockByKey(child.key, headerTag)
		// 				}
		// 			} else if (reason === "child_required") {
		// 				const { node, rule, index } = context
		// 				if (index === 1) {
		// 					change.insertNodeByKey(node.key, index, Block.create(emptyContent))
		// 				}
		// 			}
		// 		},
		// 	},
		// 	[headerTag]: {
		// 		parent: {
		// 			objects: ["block"],
		// 			types: [tag],
		// 			...blockSchema,
		// 		},
		// 		normalize(change, reason, context) {
		// 			if (reason === "parent_type_invalid") {
		// 				const { node, parent, rule } = context
		// 				if (node.nodes.size === 1 && node.nodes.get(0).object === "text") {
		// 					change.insertNodeByKey(parent.key, 0, node.nodes.get(0))
		// 				} else {
		// 					console.log("panic! At the disco.")
		// 				}
		// 			}
		// 		},
		// 	},
		// 	[contentTag]: {
		// 		parent: {
		// 			objects: ["block"],
		// 			types: [tag],
		// 			...documentSchema,
		// 		},
		// 		normalize(change, reason, context) {
		// 			if (reason === "parent_type_invalid") {
		// 				const { node, parent, rule } = context
		// 				// Actually we should just delete this, so don't do anything
		// 			}
		// 		},
		// 	},
	},
}
