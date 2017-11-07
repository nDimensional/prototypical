import md from "markdown-it"

const parser = md({linkify: true})
parser.disable("image")

export default function parse(text, env) {
    return parser.parseInline(text, env || {})
}