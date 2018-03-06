import { tag } from "./utils.js"

export const paragraphType = "p"
export const imageType = "img"
export const documentType = "document"
export const listItemType = "li"
export const blockquoteItemType = "div"
export const listItemTypes = [listItemType, blockquoteItemType]
export const headingTypes = ["h1", "h2", "h3"]
export const listTypes = ["blockquote", "ul"]
export const blockTypes = [
	paragraphType,
	imageType,
	documentType,
	...headingTypes,
	...listTypes,
	...listItemTypes,
]

export const listItemMap = {
	ul: listItemType,
	blockquote: blockquoteItemType,
}

export const markTypes = ["strong", "em", "u", "code", "a"]

export const blockTests = {
	img: /^!\[([^\[\]]+)]\(([^\)]+)\)$/,
	h1: /^#($|[^#])/,
	h2: /^##($|[^#])/,
	h3: /^###($|[^#])/,
	blockquote: /^>($|[^>])/,
	ul: /^-($|[^-])/,
}

export const documentTest = /^(#{1,3})\[([^\[\]]+)\]\(([^\)]+)\)$/

export const prefixes = {
	h1: "#",
	h2: "##",
	h3: "###",
	[blockquoteItemType]: ">",
	[listItemType]: "-",
}

export const createParagraph = text => ({
	object: "block",
	type: "p",
	isVoid: false,
	data: {},
	nodes: [
		{
			object: "text",
			leaves: [{ object: "leaf", text, marks: [] }],
		},
	],
})

const blockSchema = {
	nodes: [{ objects: ["text"], min: 1 }],
	normalize(change, violation, context) {
		console.log("normalizing block schema", violation, context)
	},
}

const documentSchema = {
	nodes: [{ types: blockTypes, min: 1 }],
	normalize(change, violation, context) {
		console.log("normalizing root document", violation, context)
	},
}

const listSchema = type => ({
	nodes: [{ objects: ["block"], types: [listItemMap[type]], min: 1 }],
})

const headingSchemas = {}
headingTypes.forEach(type => (headingSchemas[type] = blockSchema))

const listSchemas = {}
listTypes.forEach(type => (listSchemas[type] = listSchema(type)))

export default {
	document: documentSchema,
	blocks: {
		[paragraphType]: blockSchema,
		[listItemType]: blockSchema,
		[imageType]: blockSchema,
		[documentType]: {
			nodes: [{ types: headingTypes, min: 1 }, { types: blockTypes, min: 1 }],
			normalize(change, violation, context) {
				if (violation === "child_required") {
					const { node, index } = context
					const depth = node.data.get("depth")
					change.insertNodeByKey(
						node.key,
						index,
						createParagraph("wow check this shit out")
					)
				} else if (violation === "child_type_invalid") {
					const { node, child, index } = context
					console.log(
						"document",
						violation,
						change,
						change.flags.enter,
						child.toJS()
					)
				}
			},
		},
		...headingSchemas,
		...listSchemas,
	},
}
