import "babel-polyfill"
import React, { Component } from "react"
import { Editor } from "slate-react"
import { Value, Change, Schema } from "slate"
import { Map, List } from "immutable"
import niceware from "niceware"

import createYjs, { set, Y } from "./y"

import { initial, save, load, key, index } from "./serialize.jsx"
import schema from "./schema.js"

import applyOperation, { walk } from "./operation"
import applyObservation, { spawn } from "./observation"

import validateNode from "./validateNode"
import renderMark from "./renderMark.jsx"
import renderNode from "./renderNode.jsx"
import decorateNode from "./decorateNode"

import { getPath, getRoom, mac } from "./utils"
import { autoClose } from "./plugins"

window.Value = Value

const plugins = [autoClose(["[]", "()"])]
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
		const room = getRoom()
		const loading = !!path
		const syncing = !!room
		this.state = { room, path, value, loading, syncing, error: false }
		this.flags = { local: false }
		this.queue = {}
		this.ipfs = this.props.ipfs
		this.y = null
	}

	componentDidMount() {
		const { syncing, loading, room, path } = this.state
		if (syncing && this.ipfs !== null) {
			this.join(room)
		} else if (loading && this.ipfs !== null) {
			load(this.ipfs, path).then(value =>
				this.setState({ value, loading: false })
			)
		}

		window.setValue = value => this.setState({ value })

		window.addEventListener("keydown", event => {
			const { keyCode, metaKey, ctrlKey, shiftKey } = event
			const option = mac ? metaKey : ctrlKey
			if (keyCode === 79 && option) {
				event.preventDefault()
				if (shiftKey) {
					// Join a room
					const room = window.prompt("Enter a room to join", this.state.room)
					if (room && room !== this.state.room) {
						window.history.pushState({}, room, `?${room}`)
						this.join(room)
					}
				} else {
					// Load a hash
					const path = window.prompt("Enter a hash to load", this.state.path)
					if (path && path !== this.state.path) {
						window.history.pushState({}, path, `#${path}`)
						this.open(path)
					}
				}
			} else if (keyCode === 83 && option) {
				event.preventDefault()
				if (shiftKey) {
					// Show the room to join
					this.share()
				} else {
					// Save the hash
					this.save()
				}
			}
		})

		window.addEventListener("hashchange", async event => {
			event.preventDefault()
			const path = getPath()
			if (path === "") {
				this.setState({ value: values.empty, path })
			} else {
				this.open(path)
			}
		})
	}

	componentDidCatch(error, info) {
		console.error(error, info)
		this.setState({ error: true })
	}

	shouldComponentUpdate(props, state) {
		return state.value.data.get("violations").size === 0
	}

	async open(path) {
		if (this.ipfs !== null) {
			this.setState({ loading: true, room: "", path })
			if (this.y !== null) {
				this.y.destroy()
				this.y = null
			}
			const value = await load(this.ipfs, path)
			this.setState({ value, loading: false })
		}
	}

	async join(room) {
		if (this.ipfs !== null) {
			this.setState({ syncing: true, loading: false, room, path: "" })
			if (this.y !== null) {
				await this.y.destroy()
			}
			this.y = await createYjs(this.ipfs, room)
			this.y.connector.onUserEvent(({ action, user }) =>
				console.log(action, user)
			)
			this.y.connector.whenSynced(event => {
				const document = spawn(this.y.share.value.get("document"))
				const path = this.y.share.value.get("path")
				if (path && path !== this.state.path) {
					window.history.replaceState({}, path, `#${path}`)
				}
				const value = Value.create({
					document,
					data: Map({ violations: List([]) }),
				})
				console.log("overwriting with synced document")
				this.setState({ value, path, syncing: false })
			})
			this.y.share.value.observeDeep(event => this.observe(event))
		}
	}

	async save() {
		if (this.ipfs !== null) {
			const files = await save(this.ipfs, this.state.value)
			const { hash } = files.find(({ path }) => path === key)
			window.history.replaceState({}, hash, `#${hash}`)
			this.setState({ path: hash })
			if (this.y !== null) {
				this.y.share.value.set("path", hash)
			}
		}
	}

	async share() {
		if (this.ipfs !== null) {
			if (this.y === null) {
				const { path } = this.state
				const room = niceware.generatePassphrase(6).join("-")
				window.history.pushState({}, room, `?${room}#${path}`)
				this.y = await createYjs(this.ipfs, room)
				this.y.connector.onUserEvent(event => console.log("userEvent", event))
				const walker = walk(this.state.value.document, this.y)
				set(this.y.share.value, "document", walker)
				this.y.share.value.set("path", path || "")
				this.y.share.value.observeDeep(event => this.observe(event))
				this.setState({ room }, () => window.alert(room))
			} else {
				window.alert(this.state.room)
			}
		}
	}

	onChange(change) {
		const { syncing, loading } = this.state
		if (syncing || loading) {
			return
		} else if (this.y === null) {
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

	onKeyDown(event, change) {
		if (event.keyCode === 13) {
			change.flags.enter = true
		}
	}

	observe(event) {
		if (this.state.syncing) {
			// ignore remote observations while syncing
		} else if (this.flags.local) {
			// ignore local observations
		} else if (event.object === y.share.value && event.name === "path") {
			// update hash
			const path = event.value
			window.history.replaceState({}, path, `#${path}`)
		} else {
			const value = applyObservation(event, this.state.value)
			if (value !== this.state.value) {
				this.setState({ value })
			}
		}
	}
	render() {
		const { value, error, loading, syncing } = this.state
		if (error) {
			return (
				<div>
					<p>Nobody's perfect, and this app is especially so :-/</p>
					<p>Try reloading?</p>
				</div>
			)
		}
		const readOnly = loading || syncing
		const renderValue = syncing
			? values.syncing
			: loading ? values.loading : value
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
				onKeyDown={(event, change) => this.onKeyDown(event, change)}
				validateNode={node => validateNode(node)}
				decorateNode={decorateNode}
				renderNode={renderNode}
				renderMark={renderMark}
			/>
		)
	}
}
