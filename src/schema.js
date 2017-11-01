export const types = ["p", "h1", "h2", "h3"]
export const tests = {
    p: /^(?!##?#?($|[^#]))/,
    h1: /^#($|[^#])/,
    h2: /^##($|[^#])/,
    h3: /^###($|[^#])/,
}

const count = /^#*/
function normalize(change, reason, context) {
    const {text} = context
    const [{length}] = count.exec(text)
    const index = length < 4 ? length : 0
    change.setNodeByKey(context.node.key, types[index])
}

const blocks = {}
const nodes = [{kinds: ["text"]}]
types.forEach(type => blocks[type] = {text: tests[type], nodes, normalize})

export default {
    document: {nodes: [{kinds: ["block"], types}]},
    blocks
}