import React from 'react'
import Html from 'slate-html-serializer'
import {types, tests} from "./schema.js"

const headings = {
    h1: "#",
    h2: "##",
    h3: "###",
}

// const flatten = array => array.reduce((prev, elem) => prev.concat(elem), [])
// window.flatten = flatten


const rules = [
    {
        deserialize(element, next) {
            const type = element.tagName.toLowerCase()
            if (types.includes(type)) {
                if (headings.hasOwnProperty(type)) {
                    const text = document.createTextNode(headings[type] + " ")
                    element.insertBefore(text, element.firstChild)
                    element.normalize()
                }
                return {kind: "block", type, nodes: next(element.childNodes)}
            }
        },
        serialize(object, children) {
            console.log(object.type, children)
            if (tests[object.type].test())
            switch(object.type) {
                case "p":
                    return <p>{children}</p>
                case "h1":

                    return <h1>{children}</h1>
                case "h2":
                    return <h2>{children}</h2>
                case "h3":
                    return <h3>{children}</h3>
                default:
                    return children
            }
            // let childArray = typeof children === "string" ?
            //     [children] :
            //     flatten(flatten(children.toArray().map(child => child.toArray())))
            // childArray = childArray.map(c => typeof c === "string" ? c.trim() : c)
            // switch (object.type) {
            //     case "line":
            //     case "p":
            //     case "paragraph":
            //         return <span>{childArray}</span>
            //     case "h1":
            //         return <span>{childArray}</span>
            //     case "h2":
            //         return <span>{childArray}</span>
            //     case "h3":
            //         return <span>{childArray}</span>
            // }
        }
    }
]

export default new Html({rules})