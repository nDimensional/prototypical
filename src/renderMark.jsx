import React from "react"

export default function renderMark(props) {
    const {mark: {type, data}, children, text} = props
    switch (type) {
        case "a":
            return <a href={text}>{children}</a>
        case "strong":
            return <strong>{children}</strong>
        case "em":
            return <em>{children}</em>
        case "u":
            return <u>{children}</u>
        case "code":
            return <code>{children}</code>
        case "img":
            return <figure>
                <figcaption>{children}</figcaption>
                <img src={data.get("src")} />
            </figure>
    }
}