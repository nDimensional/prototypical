export const blockTypes = ["p", "h1", "h2", "h3", "img", "blockquote", "node"]
export const markTypes = ["strong", "em", "u", "code", "a"]
// const elementName = "proto-node"

export const text = {
    node: /^@\[([^\[]*)]\(([^)]+)\)/,
    img: /^!\[([^\[]*)]\(([^)]+)\)/,
    h1: /^#($|[^#])/,
    h2: /^##($|[^#])/,
    h3: /^###($|[^#])/,
    blockquote: /^>($|[^>])/
}

export const data = {
    image({src, alt}) {
        console.log("validating", src, alt)
    }
}

const split = type => `(${text[type].source.slice(1)})`
const negatives = Object.keys(text).map(split).join("|")
text.p = new RegExp(`^(?!(${negatives}))`)

export const headings = {
    blockquote: ">",
    h1: "#",
    h2: "##",
    h3: "###",
}

function normalize(change, reason, context) {
    if (reason === "node_text_invalid") {
        const {node} = context
        const type = blockTypes.find(type => text[type].test(node.text))
        const block = {kind: "block", type}
        if (type === "image") {
        } else if (type === "node") {
        } else {
            // ok
        }
        change.setNodeByKey(node.key, block)
    }
}

const validators = {text, data}
const blocks = {}
const nodes = [{kinds: ["text"]}]
blockTypes.forEach(type => {
    blocks[type] = {nodes, normalize}
    Object.keys(validators).forEach(key => {
        if (validators[key].hasOwnProperty(type)) {
            blocks[type][key] = validators[key][type]
        }
    })
})

export default {
    document: {nodes: [{kinds: ["block"], types: blockTypes}]},
    blocks
}
