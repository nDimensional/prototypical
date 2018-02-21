import React from "react"

export default function renderMark(props) {
	const { mark: { type }, children, text } = props
	switch (type) {
		case "a":
			return (
				<a
					onClick={e => e.metaKey && window.open(text, "_blank").focus()}
					href={text}
				>
					{children}
				</a>
			)
		case "strong":
			return <strong>{children}</strong>
		case "em":
			return <em>{children}</em>
		case "u":
			return <u>{children}</u>
		case "code":
			return <code>{children}</code>
	}
}
