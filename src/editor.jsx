import React, { Component } from "react"
import "babel-polyfill"
import { Editor, findDOMRange, findRange } from "slate-react"
import { Text, Character, Value, Data, Block, Inline, Document } from "slate"
import { html, serialize, deserialize } from "./serialize.jsx"
import schema from "./schema.js"
import { is } from "immutable"

import applyOperation, { walk } from "./operation"

import validateNode from "./validateNode"
import renderMark from "./renderMark.jsx"
import renderNode from "./renderNode.jsx"
import decorateNode from "./decorateNode"

import { autoClose, indent } from "./plugins"

import { Y, set, isText, isArray, isMap } from "./y"

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
					{
						object: "text",
						leaves: [{ object: "leaf", text: "", marks: [] }],
					},
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
		set(y.share.value, "document", walk(value.document, y))
		this.state = { path, loading, value }
		y.share.value.observeDeep(events => this.observe(events))
		// y.share.value.observeDeep(events => console.log(events))
		y.connector.onUserEvent(event => console.log("userevent! yaas", event))
		this.local = false
	}

	onChange(change) {
		// const { value } = change
		// const value = this.state.value.set("selection", change.value.selection)
		this.local = true
		const value = change.operations.reduce(
			(value, operation) => applyOperation(value, operation, this.props.y),
			this.state.value
		)
		this.local = false
		this.setState({ value })
	}

	observe(events) {
		console.log("I am observing shit.")
		if (this.local || !window.go) {
			return
		}
		const { value } = this.state
		const root = [events].reduce((root, event) => {
			console.log(event)
			const { type, path, object } = event
			const nodePath = path.slice(1).filter((n, i) => i % 2 === 1)
			const node = nodePath.reduce((root, index) => root.nodes.get(index), root)
			if (isText(object)) {
				const { index, length, values } = event
				const inserted = type === "insert" ? Character.createList(values) : []
				const deleted = type === "insert" ? 0 : length
				const args = [index, deleted, ...inserted]
				const characters = node.characters.splice.apply(node.characters, args)
				return root.updateNode(node.set("characters", characters))
			} else if (isArray(object)) {
				const { index, length, values } = event
				const inserted = type === "insert" ? values.map(spawn) : []
				const deleted = type === "insert" ? 0 : length
				const args = [index, deleted, ...inserted]
				const nodes = node.nodes.splice.apply(node.nodes, args)
				return root.updateNode(node.set("nodes", nodes))
			} else if (isMap(object)) {
				console.log("missing a map thing")
				return root
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

function spawn(y) {
	if (isText(y)) {
		const text = Text.create({ text: y.toString() })
		y.key = text.key
		return text
	} else if (isMap(y)) {
		const object = y.get("object")
		const data = y.get("data")
		const nodes = y
			.get("nodes")
			.toArray()
			.map(spawn)
		const properties = { object, data, nodes }
		if (object === "block" || object === "inline") {
			properties.type = y.get("type")
			properties.isVoid = y.get("isVoid")
		}
		const node = constructorMap[object].create(properties)
		y.key = node.key
		return node
	}
}

window.spawn = spawn
window.Block = Block
window.is = is
window.Text = Text
