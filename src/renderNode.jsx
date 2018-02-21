import React from "react"
import { Map } from "immutable"
import { tag } from "./utils.js"
import {
	paragraphType,
	headingTypes,
	listTypes,
	imageType,
	listItemTypes,
} from "./schema.js"

const renderers = {
	[imageType]({ node: { data }, attributes, children }) {
		return (
			<p {...attributes}>
				{children}
				<img {...data.toJS()} />
			</p>
		)
	},
}

export default function renderNode(props) {
	const { node: { type }, attributes, children } = props
	if (type === paragraphType || headingTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (listTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (listItemTypes.includes(type)) {
		return React.createElement(type, attributes, children)
	} else if (renderers.hasOwnProperty(type)) {
		return renderers[type](props)
	}
}
