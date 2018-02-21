import { tag } from "./utils.js"

export const paragraphType = "p"
export const imageType = "img"
export const listItemType = "li"
export const blockquoteItemType = "div"
export const listItemTypes = [listItemType, blockquoteItemType]
export const headingTypes = ["h1", "h2", "h3"]
export const listTypes = ["blockquote", "ul"]
export const blockTypes = [
	paragraphType,
	...headingTypes,
	imageType,
	...listTypes,
	...listItemTypes,
]

export const listItemMap = {
	ul: listItemType,
	blockquote: blockquoteItemType,
}

export const markTypes = ["strong", "em", "u", "code", "a"]

export const blockTests = {
	img: /^!\[([^\[]*)]\(([^)]+)\)$/,
	h1: /^#($|[^#])/,
	h2: /^##($|[^#])/,
	h3: /^###($|[^#])/,
	blockquote: /^>($|[^>])/,
	ul: /^-($|[^-])/,
}

export const prefixes = {
	h1: "#",
	h2: "##",
	h3: "###",
	[blockquoteItemType]: ">",
	[listItemType]: "-",
}

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

const documentSchema = { nodes: [{ types: blockTypes, min: 1 }] }
const blockSchema = {
	nodes: [{ objects: ["text"], min: 1 }],
	normalize(change, reason, context) {
		console.log("normalizing block schema", reason, context)
	},
}
const listSchema = type => ({
	nodes: [{ objects: ["block"], types: [listItemMap[type]], min: 1 }],
	normalize(change, reason, context) {
		console.log("normalizing list schema", type, reason, context)
	},
})

const ListItemSchema = type => ({
	...blockSchema,
	normalize(change, reason, context) {
		console.log("normalizing list item schema", reason, context)
	},
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
		...headingSchemas,
		...listSchemas,
	},
}
