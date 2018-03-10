const decorationMap = {
	strong: "**",
	em: "*",
}

// pairs are ["()", "[]", "``", ...]
export const autoClose = pairs => ({
	onKeyDown(event, change, editor) {
		const { keyCode } = event
		if (keyCode === 8) {
			// delete
			const { document, selection } = editor.value
			const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
			if (focusKey === anchorKey && anchorOffset === focusOffset) {
				const { text } = document.getDescendant(focusKey)
				const pair = text.slice(focusOffset - 1, focusOffset + 1)
				if (pairs.includes(pair)) {
					change.deleteForward(1)
					change.deleteBackward(1)
					return change
				}
			}
		}
	},
	onBeforeInput(event, change, editor) {
		const { data } = event

		const open = pairs.find(([key]) => data === key)
		if (open) {
			if (open[0] === open[1] && change.value.selection.isCollapsed) {
				const key = change.value.selection.focusKey
				const offset = change.value.selection.focusOffset
				const decorations = change.value.document
					.getParent(key)
					.getDecorations(editor.stack)
					.filter(
						decoration =>
							decoration.focusKey === key &&
							decoration.anchorKey === key &&
							decoration.startOffset < offset &&
							decoration.endOffset > offset
					)
			}

			event.preventDefault()
			change.insertText(open)
			change.move(-1)
			return change
		}

		const close = pairs.find(([_, key]) => data === key)
		if (close) {
			const { document, selection } = editor.value
			const { anchorKey, focusKey, anchorOffset, focusOffset } = selection
			if (focusKey === anchorKey && anchorOffset === focusOffset) {
				const { text } = document.getDescendant(focusKey)
				if (text[focusOffset] === close[1]) {
					event.preventDefault()
					change.move(1)
					return change
				}
			}
		}
	},
})
