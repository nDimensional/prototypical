import React from "react"
import { tag } from "./utils.js"
import { headingTypes, defaultType } from "./schema.js"
import { Map } from "immutable"

const renderers = {
	img({ node: { data }, attributes, children }) {
		return (
			<p {...attributes}>
				{children}
				<img {...data.toJS()} />
			</p>
		)
	},
	[tag]({ attributes, children, node: { data } }) {
		const [caption, ...content] = children
		const depth = data.get("depth")
		const headingType = headingTypes[depth]
		return (
			<div {...attributes}>
				{React.createElement(headingType, {}, caption)}
				{content}
				<hr />
			</div>
		)
	},
}

export default function renderNode(props) {
	const { node: { type }, attributes, children } = props
	if (type === defaultType || headingTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (renderers.hasOwnProperty(type)) {
		return renderers[type](props)
	}
}
