
// pairs are ["()", "[]", ...]
export const autoClose = pairs => ({
    onKeyDown(event, change, editor) {
        const {keyCode} = event
        if (keyCode === 8) {
            // delete
            const {document, selection} = editor.value
            const {anchorKey, focusKey, anchorOffset, focusOffset} = selection
            if (focusKey === anchorKey && anchorOffset === focusOffset) {
                const {text} = document.getDescendant(focusKey)
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
        const {data} = event

        const open = pairs.find(([key]) => data === key)
        if (open) {
            event.preventDefault()
            change.insertText(open)
            change.move(-1)
            return change
        }

        const close = pairs.find(([_, key]) => data === key)
        if (close) {
            const {document, selection} = editor.value
            const {anchorKey, focusKey, anchorOffset, focusOffset} = selection
            if (focusKey === anchorKey && anchorOffset === focusOffset) {
                const {text} = document.getDescendant(focusKey)
                if (text[focusOffset] === close[1]) {
                    event.preventDefault()
                    change.move(1)
                    return change
                }
            }
        }
    }
})

function getCommonAncestor(a, b) {
    if (a === b) {
        return [a, b]
    }
}

export const indent = () => ({
    onKeyDown(event, change, editor) {
        const {keyCode, shiftKey} = event
        if (keyCode === 9) {
            event.preventDefault()
            // if (shiftKey) {
            //     change.unwrapBlock({kind: "block"})
            // } else {
            //     change.wrapBlock("please-wrap-me")
            // }
        }
    }
})