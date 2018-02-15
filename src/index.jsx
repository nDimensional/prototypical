import React from "react"
import ReactDOM from "react-dom"
import Editor from "./editor.jsx"

// import { is, Map } from "immutable"
// import { Changes } from "slate"

// Changes.insertFragment = function(change, fragment) {
// 	if (!fragment.nodes.size) return

// 	var value = change.value
// 	var _value = value,
// 		document = _value.document,
// 		selection = _value.selection
// 	var _value2 = value,
// 		startText = _value2.startText,
// 		endText = _value2.endText,
// 		startInline = _value2.startInline

// 	var lastText = fragment.getLastText()
// 	var lastInline = fragment.getClosestInline(lastText.key)
// 	var keys = document.getTexts().map(function(text) {
// 		return text.key
// 	})
// 	var isAppending =
// 		!startInline ||
// 		selection.hasEdgeAtStartOf(startText) ||
// 		selection.hasEdgeAtEndOf(endText)

// 	change.insertFragmentAtRange(selection, fragment)
// 	value = change.value
// 	document = value.document

// 	var newTexts = document.getTexts().filter(function(n) {
// 		return !keys.includes(n.key)
// 	})
// 	var newText = isAppending ? newTexts.last() : newTexts.takeLast(2).first()

// 	if (newText && lastInline) {
// 		change.select(selection.collapseToEndOf(newText))
// 		// } else if (newText) {
// 		// 	console.log("option b", selection, newText, lastText, lastText.text.length)
// 		// 	change.select(
// 		// 		selection.collapseToStartOf(newText).move(lastText.text.length)
// 		// 	)
// 	} else {
// 		change.select(selection.collapseToStart().move(lastText.text.length))
// 	}
// }

ReactDOM.render(<Editor />, document.querySelector("main"))
