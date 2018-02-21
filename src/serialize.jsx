import React from "react"
import { Map, List } from "immutable"
import { Value } from "slate"
import HTML from "slate-html-serializer"
import {
	paragraphType,
	blockTypes,
	blockTests,
	headingTypes,
	listTypes,
	prefixes,
	imageType,
	listItemType,
	listItemTypes,
} from "./schema.js"

export const index = "index.html"
export const key = "prototypical"

const head = `<meta charset="UTF-8"><title>${key}</title>`
const style = ""
function template(body) {
	return `<!DOCTYPE html><html lang="en"><head>${head}</head><style>${style}</style><body>${body}</body></html>`
}

const rules = [
	{
		deserialize(element, next) {
			const type = element.tagName.toLowerCase()
			if (blockTypes.includes(type)) {
				const block = { object: "block", type }
				if (prefixes.hasOwnProperty(type)) {
					const node = document.createTextNode(prefixes[type] + " ")
					element.insertBefore(node, element.firstChild)
					element.normalize()
					block.nodes = next(element.childNodes)
				} else if (type === paragraphType) {
					block.nodes = next(element.childNodes)
				} else if (type === imageType) {
					const { src, alt } = element
					block.data = Map({ src, alt })
					const node = document.createTextNode(`![${alt}](${src})`)
					block.nodes = next([node])
				} else if (listTypes.includes(type)) {
					block.nodes = next(element.childNodes)
				}
				return block
			}
		},
		serialize(block, children) {
			const { object, type, data } = block
			if (object === "block") {
				if (prefixes.hasOwnProperty(type)) {
					const [[first, ...rest], ...last] = children.toJS()
					const { length } = prefixes[type]
					first[0] = first[0].slice(length).trim()
					return React.createElement(type, {}, [[first, ...rest], ...last])
				} else if (type === paragraphType) {
					return <p>{children}</p>
				} else if (type === imageType) {
					return <img {...data.toJS()} />
				} else if (listTypes.includes(type)) {
					return React.createElement(type, {}, children)
				}
			}
		},
	},
]

export const html = new HTML({ rules })

export function save(ipfs, value) {
	const path = `${key}/${index}`
	const text = template(html.serialize(value))
	console.log("text!", text)
	const encoder = new TextEncoder("utf-8")
	const content = new ipfs.types.Buffer(encoder.encode(text))
	return ipfs.files.add([{ path, content }])
}

export async function load(ipfs, hash) {
	const decoder = new TextDecoder("utf-8")
	const files = await ipfs.files.get(hash)
	const { name } = files.find(({ depth }) => depth === 0)
	const { content } = files.find(({ path }) => path === `${name}/${index}`)
	const text = decoder.decode(content)
	const value = html.deserialize(text)
	return value.set("data", value.data.set("violations", List([])))
}

export const initial = text => ({
	object: "value",
	data: {
		violations: List([]),
	},
	document: {
		object: "document",
		key: "root",
		data: {},
		nodes: [
			{
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
			},
		],
	},
})
