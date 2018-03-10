import React from "react"
import { Map } from "immutable"
import { tag } from "./utils.js"
import {
	paragraphType,
	headingTypes,
	listTypes,
	imageType,
	headerType,
	documentType,
	listItemTypes,
} from "./schema.js"

function renderDocument(contents) {
	if (contents && contents.length > 0) {
		return contents
	} else {
		return <p className="loading">I am loading stuff to do</p>
	}
}

const renderers = {
	[imageType]({ node: { data }, attributes, children }) {
		return (
			<p {...attributes}>
				{children}
				<img {...data.toJS()} />
			</p>
		)
	},
	[documentType]({ node: { data }, attributes, children }) {
		const [header, ...contents] = children
		return (
			<div className="transclusion" {...attributes}>
				{header}
				{renderDocument(contents)}
			</div>
		)
	},
}

const maxHeader = 6

export default function renderNode(props) {
	const { node: { type, data }, attributes, children } = props
	if (type === paragraphType) {
		return React.createElement(type, attributes, children)
	} else if (headingTypes.includes(type)) {
		if (data.has("header") && data.get("header")) {
			return React.createElement(
				type,
				{ ...attributes, className: "header" },
				children
			)
		} else {
			return React.createElement(type, attributes, children)
		}
		// const floor = data.get("floor")
		// if (data.has("header") && data.get("header")) {
		// return React.createElement(
		// 	"h" + floor,
		// 	{ ...attributes, className: "header" },
		// 	children
		// )
		// } else {
		// 	const depth = +type[1]
		// 	const heading = "h" + Math.min(depth + floor, maxHeader)
		// 	return React.createElement(heading, attributes, children)
		// }
	} else if (listTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (listItemTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (renderers.hasOwnProperty(type)) {
		return renderers[type](props)
	}
}
