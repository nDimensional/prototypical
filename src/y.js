// import yJS from "../yjs/yjs/src/Y.js"

const yJS = require("yjs/dist/y.js")
const yArray = require("y-array/dist/y-array")
const yText = require("y-text/dist/y-text")
const yMap = require("y-map/dist/y-map")
const yMemory = require("y-memory/dist/y-memory")
const yIpfs = require("y-ipfs-connector")

// import yMemory from "../yjs/y-memory.js"
// import yIpfs from "../yjs/y-ipfs-connector"

import { tag } from "./utils"

yJS.extend(yArray, yText, yMap)
yJS.extend(yMemory, yIpfs)
export const Y = yJS
window.Y = yJS

export default async function(ipfs, room) {
	const y = await Y({
		db: {
			name: "memory",
		},
		connector: {
			name: "ipfs",
			ipfs,
			room,
		},
		share: {
			value: "Map",
		},
	})
	// y.define("pool", Y.Map)
	return (window.y = y)
}

export function isMap(y) {
	return y && y.constructor === Y.Map.typeDefinition.class
}

export function isArray(y) {
	return y && y.constructor === Y.Array.typeDefinition.class
}

export function isText(y) {
	return y && y.constructor === Y.Text.typeDefinition.class
}

export function isType(y) {
	return y && (isMap(y) || isArray(y) || isText(y))
}

export function getType(y) {
	if (y) {
		const type = [Y.Map, Y.Array, Y.Text]
			.map(t => t.typeDefinition)
			.find(t => t.class === y.constructor)
		if (type) {
			return type.name
		}
	}
	return null
}

// Shim the default Y.Map.set
function _set(key, value, trip) {
	// set property.
	// if property is a type, return it
	// if not, apply immediately on this type an call event

	var right = this.map[key] || null
	var insert /* :any */ = {
		id: this.os.getNextOpId(1),
		left: null,
		right: right,
		origin: null,
		parent: this._model,
		parentSub: key,
		struct: "Insert",
	}
	var eventHandler = this.eventHandler
	var typeDefinition = Y.utils.isTypeDefinition(value)
	if (isType(value)) {
		insert.opContent = value._model
		// construct a new type
		this.os.requestTransaction(function*() {
			yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [
				[insert],
			])
		})
		eventHandler.awaitAndPrematurelyCall([insert])
		return value
	} else if (typeDefinition !== false) {
		var type = this.os.createType(typeDefinition)
		insert.opContent = type._model
		// construct a new type
		this.os.requestTransaction(function*() {
			yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [
				[insert],
			])
		})
		// always remember to do that after this.os.requestTransaction
		// (otherwise values might contain a undefined reference to type)
		eventHandler.awaitAndPrematurelyCall([insert])
		return type
	} else {
		insert.content = [value]
		this.os.requestTransaction(function*() {
			yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [
				[insert],
			])
		})
		// always remember to do that after this.os.requestTransaction
		// (otherwise values might contain a undefined reference to type)
		eventHandler.awaitAndPrematurelyCall([insert])
		return value
	}
}

function _insert(pos, contents) {
	if (typeof pos !== "number") {
		throw new Error("pos must be a number!")
	}
	if (!Array.isArray(contents)) {
		throw new Error("contents must be an Array of objects!")
	}
	if (contents.length === 0) {
		return
	}
	if (pos > this._content.length || pos < 0) {
		throw new Error("This position exceeds the range of the array!")
	}
	var mostLeft = pos === 0 ? null : this._content[pos - 1].id

	var ops = []
	var prevId = mostLeft
	for (var i = 0; i < contents.length; ) {
		var op = {
			left: prevId,
			origin: prevId,
			// right: mostRight,
			// NOTE: I intentionally do not define right here, because it could be deleted
			// at the time of inserting this operation (when we get the transaction),
			// and would therefore not defined in this._content
			parent: this._model,
			struct: "Insert",
		}
		var _content = []
		var typeDefinition
		var actualType
		while (i < contents.length) {
			var val = contents[i++]
			typeDefinition = Y.utils.isTypeDefinition(val)
			actualType = isType(val) ? val : null
			if (!typeDefinition && !actualType) {
				_content.push(val)
			} else if (_content.length > 0) {
				i-- // come back again later
				break
			} else {
				break
			}
		}
		if (_content.length > 0) {
			// content is defined
			op.content = _content
			op.id = this.os.getNextOpId(_content.length)
		} else {
			// otherwise its a type
			if (typeDefinition) {
				// it's an uninitialized type
				var typeid = this.os.getNextOpId(1)
				this.os.createType(typeDefinition, typeid)
				op.opContent = typeid
			} else if (actualType) {
				// it's an initialized type
				var typeid = actualType._model
				op.opContent = typeid
			}
			op.id = this.os.getNextOpId(1)
		}
		ops.push(op)
		prevId = op.id
	}
	var eventHandler = this.eventHandler
	this.os.requestTransaction(function*() {
		// now we can set the right reference.
		var mostRight
		if (mostLeft != null) {
			var ml = yield* this.getInsertionCleanEnd(mostLeft)
			mostRight = ml.right
		} else {
			mostRight = (yield* this.getOperation(ops[0].parent)).start
		}
		for (var j = 0; j < ops.length; j++) {
			var op = ops[j]
			op.right = mostRight
		}
		yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [ops])
	})
	// always remember to do that after this.os.requestTransaction
	// (otherwise values might contain a undefined reference to type)
	eventHandler.awaitAndPrematurelyCall(ops)
}

export function set(map, key, value) {
	return _set.apply(map, [key, value])
}

window.set = set

export function insert(array, pos, contents) {
	return _insert.apply(array, [pos, contents])
}

window.insert = insert

export function createMap(y, properties) {
	const map = y.db.createType([Y.Map.typeDefinition])
	Object.keys(properties).forEach(key => set(map, key, properties[key]))
	return map
}

export function createArray(y, contents) {
	const array = y.db.createType([Y.Array.typeDefinition])
	insert(array, 0, contents)
	return array
}

export function createText(y, string) {
	const text = y.db.createType([Y.Text.typeDefinition])
	text.push(string)
	return text
}
