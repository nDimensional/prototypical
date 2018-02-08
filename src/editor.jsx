import React, { Component } from "react"
import "babel-polyfill"
import { Editor, findDOMRange, findRange } from "slate-react"
import {
	Text,
	Character,
	Value,
	Range,
	Data,
	Block,
	Inline,
	Document,
} from "slate"
import { html, serialize, deserialize } from "./serialize.jsx"
import schema from "./schema.js"
import { is } from "immutable"

import applyOperation, { walk } from "./operation"

import validateNode from "./validateNode"
import renderMark from "./renderMark.jsx"
import renderNode from "./renderNode.jsx"
import decorateNode from "./decorateNode"

import { autoClose, indent } from "./plugins"

import { Y } from "./y"

const constructorMap = {
	block: Block,
	inline: Inline,
	document: Document,
	text: Text,
}

const plugins = [autoClose(["[]", "()"]), indent()]

const values = {
	loading: "<P>LOADING...</P>",
	empty: "<P></P>",
}
window.Text = Text
window.Character = Character
const placeholder = "hello"

const initial = {
	object: "value",
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
					{ object: "text", leaves: [{ object: "leaf", text: "", marks: [] }] },
				],
			},
		],
	},
}

export default class extends Component {
	constructor(props) {
		super(props)
		const { path, ipfs, y } = props
		const loading = !!path
		const value = Value.create(initial)
		this.pool = y.share.pool
		walk(value.document, this.pool)
		this.state = { path, loading, value }
		this.pool.observeDeep(events => this.observe(events))
		// this.pool.observeDeep(events => console.log(events))
		y.connector.onUserEvent(event => console.log("userevent! yaas", event))
		this.waitingArea = {}
	}

	onChange(change) {
		// const { value } = change
		// const value = this.state.value.set("selection", change.value.selection)
		const value = change.operations.reduce(
			(value, operation) => applyOperation(value, operation, this.pool),
			this.state.value
		)
		this.setState({ value })
	}

	observe(events) {
		const { value } = this.state
		const root = events.reduce((root, event) => {
			console.log(event)
			const { remote, path, target } = event

			if (!remote) {
				return root
			} else if (isText(target)) {
				const key = target._parentSub
				const characters = Character.createList(target.toArray())
				const text = root.getDescendant(key)
				return root.updateNode(text.set("characters", characters))
			} else if (isArray(target)) {
				const { removedElements, addedElements } = event
				if (isMap(target._parent) && target._parentSub === "nodes") {
					const key = target._parent._parentSub
					const node = root.getDescendant(key)
					const removedKeys = new Set(
						Array.from(removedElements).reduce(
							(keys, item) => keys.concat(item._content),
							[]
						)
					)
					const removedNodeList = node.nodes.filterNot(node =>
						removedKeys.has(node.key)
					)

					if (addedElements.size > 0) {
						const addedKeys = new Set(
							Array.from(addedElements).reduce(
								(keys, item) => keys.concat(item._content),
								[]
							)
						)
						const addedNodeList = target
							.toArray()
							.reduce(
								(nodeList, childKey, index) =>
									addedKeys.has(childKey)
										? nodeList.splice(
												index,
												0,
												spawn(this.pool.get(childKey), this.pool)
											)
										: nodeList,
								removedNodeList
							)
						return root.updateNode(node.set("nodes", addedNodeList))
					} else {
						return root.updateNode(node.set("nodes", removedNodeList))
					}
				}
				return root
			} else if (isMap(target)) {
				const key = target._parentSub
				if (target === this.pool) {
					const { keysChanged } = event
					keysChanged.forEach(key => {
						if (key) {
							console.log("key", key)
							console.log("target.get", target.get(key))
							if (root.hasDescendant(key)) {
								root = root.updateNode(spawn(target.get(key), this.pool))
							}
						}
					})
				} else {
				}
				return root
			}
		}, value.document)
		if (root !== value.document) {
			console.log("got a new value", root)
			this.setState({ value: value.set("document", root) })
		}
	}
	render() {
		const { value, loading } = this.state
		return (
			<Editor
				plugins={plugins}
				autoFocus={true}
				ref={editor => (this.editor = window.editor = editor)}
				schema={schema}
				readOnly={loading}
				value={value}
				placeholder={placeholder}
				onChange={change => this.onChange(change)}
				validateNode={node => validateNode(node, this.editor, this.root)}
				decorateNode={decorateNode}
				renderNode={renderNode}
				renderMark={renderMark}
			/>
		)
	}
}

function isText(y) {
	return y instanceof Y.Text
}

function isMap(y) {
	return y instanceof Y.Map
}

function isArray(y) {
	return y instanceof Y.Array
}

function spawn(y, pool) {
	const key = y._parentSub
	if (isText(y)) {
		return Text.create({ text: y.toString(), key })
	} else if (isMap(y)) {
		const object = y.get("object")
		const data = y.get("data")
		const nodes = y
			.get("nodes")
			.toArray()
			.map(key => spawn(pool.get(key), pool))
		const properties = { key, object, data, nodes }
		if (object === "block" || object === "inline") {
			properties.type = y.get("type")
			properties.isVoid = y.get("isVoid")
		}
		console.log("properties", properties)
		return constructorMap[object].create(properties)
	}
}

window.spawn = spawn
window.Block = Block
window.is = is
window.Text = Text
