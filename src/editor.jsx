import "babel-polyfill"
import React, { Component } from "react"
import { Editor } from "slate-react"
import { Value, Range } from "slate"
import niceware from "niceware"

import { initial, serialize, deserialize } from "./serialize.jsx"
import schema, { createHeader } from "./schema.js"

import applyOperation, { walk } from "./operation"
import applyObservation, { spawn } from "./observation"

import validateNode from "./validateNode"
import renderMark from "./renderMark.jsx"
import renderNode from "./renderNode.jsx"
import decorateNode from "./decorateNode"

import { autoClose, indent } from "./plugins"
import { getPath, mac, save, load, key, index } from "./utils"

import createYjs, { set } from "./y"
import createIpfs from "./ipfs"

const plugins = [autoClose(["[]", "()"]), indent()]

const placeholder = "hello"

const values = {
	empty: Value.create(initial("")),
	loading: Value.create(initial("LOADING...")),
	syncing: Value.create(initial("SYNCING...")),
}

export default class extends Component {
	constructor(props) {
		super(props)
		const value = values.empty
		const path = getPath()
		const loading = !!path
		const syncing = false
		this.state = { root: null, path, value, loading, syncing }
		this.flags = { local: false, reload: true }

		this.y = null
		this.ipfs = null
		createIpfs().then(async ipfs => {
			this.ipfs = ipfs
			const room = niceware.generatePassphrase(6).join("-")
			if (loading) {
				const root = await load(ipfs, path)
				const value = deserialize(root)
				this.setState({ value, loading: false }, () => {
					this.attach(ipfs, room, false)
				})
			} else {
				this.attach(ipfs, room, false)
			}
		})
	}

	componentDidMount() {
		window.addEventListener("keydown", event => {
			const { keyCode, metaKey, ctrlKey, shiftKey } = event
			const option = mac ? metaKey : ctrlKey
			if (keyCode === 79 && option) {
				event.preventDefault()
				if (shiftKey) {
					this.join()
				} else {
					this.open()
				}
			} else if (keyCode === 83 && option) {
				event.preventDefault()
				if (shiftKey) {
					window.alert(this.room)
				} else {
					this.save()
				}
			}
		})

		window.addEventListener("hashchange", async event => {
			event.preventDefault()
			if (this.flags.reload) {
				const path = getPath()
				if (path === "") {
					const value = values.empty
					this.setState({ value }, () => {
						if (this.y !== null) {
							const walker = walk(value.document, this.y)
							set(this.y.share.value, "document", walker)
							this.y.share.value.set("path", path)
						}
					})
				} else if (this.ipfs !== null) {
					this.setState({ loading: true })
					const root = await load(this.ipfs, path)
					const value = deserialize(root)
					this.setState({ value, loading: false }, () => {
						if (this.y !== null) {
							const walker = walk(value.document, this.y)
							set(this.y.share.value, "document", walker)
							this.y.share.value.set("path", path)
						}
					})
				}
			} else {
				this.flags.reload = true
			}
		})
	}

	open() {
		const hash = window.prompt("Enter a hash to load")
		if (hash === null) {
			// fine
		} else {
			window.location.hash = hash
		}
	}

	async load(path, room, attach) {
		console.log("loading and shit")

		if (this.ipfs !== null) {
			const root = await load(this.ipfs, path)
			const value = deserialize(root)
			this.setState({ value, loading: false }, () => {
				if (attach) {
					this.attach(this.ipfs, room, false)
				}
			})
		}
	}

	async save() {
		if (this.ipfs === null) {
			return
		}
		const value = serialize(this.state.value)
		const files = await save(this.ipfs, value)
		files
			.filter(({ path }) => path.split("/").pop() !== index)
			.forEach(({ path, hash }) => {
				if (path === key) {
					this.flags.reload = false
					window.location.hash = hash
					if (this.y !== null) {
						this.y.share.value.set("path", hash)
					}
				} else {
					// const route = path.split("/").slice(1)
					// const name = route[route.length - 1]
					// const [node, content] = route.reduce(
					// 	([child, parent], name) => {
					// 		const nodes = parent.nodes.filter(node => node.type === tag)
					// 		const node = nodes.find(
					// 			node => node.nodes.get(0).text.indexOf(`@[${name}]`) === 0
					// 		)
					// 		return [node, node.nodes.get(1)]
					// 	},
					// 	[null, this.state.value.document]
					// )
					// const { key } = node.nodes.get(0)
					// const header = createHeader({ name, path: hash })
					// this.editor.change(change => change.replaceNodeByKey(key, header))
				}
			})
	}

	join() {
		if (this.ipfs !== null) {
			const room = window.prompt("Enter a room to join", this.room)
			if (room && room !== this.room) {
				this.attach(this.ipfs, room, true)
			}
		}
	}

	async attach(ipfs, room, sync) {
		if (sync) {
			this.setState({ syncing: true })
		}
		if (this.y !== null) {
			await this.y.destroy()
		}
		this.y = await createYjs(ipfs, room)
		this.y.connector.onUserEvent(event => console.log("userEvent", event))
		this.room = room

		if (sync) {
			this.y.connector.whenSynced(event => {
				const document = spawn(this.y.share.value.get("document"))
				const path = this.y.share.value.get("path")
				if (path && path !== this.state.path) {
					this.flags.reload = false
					window.location.hash = path
				}
				const selection = Range.create()
				const value = this.state.value
					.set("selection", selection)
					.set("document", document)
				this.setState({ value, syncing: false })
				console.log("overwriting with synced document")
			})
		} else {
			const walker = walk(this.state.value.document, this.y)
			set(this.y.share.value, "document", walker)

			const { path } = this.state
			this.y.share.value.set("path", path || "")
		}

		this.y.share.value.observeDeep(event => this.observe(event))
	}

	onChange(change) {
		const { syncing, loading } = this.state
		if (syncing || loading) {
			return
		}
		if (this.y === null) {
			const { value } = change
			this.setState({ value })
		} else {
			this.flags.local = true
			const value = change.operations.reduce(
				(value, operation) => applyOperation(value, operation, this.y),
				this.state.value
			)
			this.flags.local = false
			this.setState({ value })
		}
	}

	observe(event) {
		if (this.state.syncing) {
			// ignore remote observations while syncing
		} else if (this.flags.local) {
			// ignore local observations
		} else if (event.object === y.share.value && event.name === "path") {
			// update hash
			const path = y.share.value.get("path")
			this.flags.reload = false
			window.location.hash = path
		} else {
			const value = applyObservation(event, this.state.value)
			if (value !== this.state.value) {
				this.setState({ value })
			}
		}
	}
	render() {
		const { value, loading, syncing } = this.state
		const readOnly = loading || syncing
		const renderValue = loading
			? values.loading
			: syncing ? values.syncing : value
		return (
			<Editor
				plugins={plugins}
				autoFocus={true}
				ref={editor => (this.editor = window.editor = editor)}
				schema={schema}
				readOnly={readOnly}
				value={renderValue}
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
