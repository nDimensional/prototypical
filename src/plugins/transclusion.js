// Process ![image](<src> "title")

import {normalizeReference, isSpace} from "markdown-it/lib/common/utils.js"
import {tag} from "../utils.js"

function transclusion(state, silent) {
    let attrs,
        code,
        content,
        label,
        labelEnd,
        labelStart,
        pos,
        ref,
        res,
        title,
        token,
        tokens,
        start,
        hash = '',
        oldPos = state.pos,
        max = state.posMax;


    // if (state.src.charCodeAt(state.pos) !== 0x21/* ! */) { return false; }
    // ^ Old line 0x21 = 33 = "!". Replace with "#" = 35 = 0x23
    if (state.src.charCodeAt(state.pos) !== 0x23/* # */) { return false; }
    if (state.src.charCodeAt(state.pos + 1) !== 0x5B/* [ */) { return false; }

    labelStart = state.pos + 2;
    labelEnd = state.md.helpers.parseLinkLabel(state, state.pos + 1, false);

    // parser failed to find ']', so it's not a valid link
    if (labelEnd < 0) { return false; }

    pos = labelEnd + 1;
    if (pos < max && state.src.charCodeAt(pos) === 0x28/* ( */) {
        //
        // Inline link
        //

        // [link](  <hash>  )
        //        ^^ skipping these spaces
        pos++;
        for (; pos < max; pos++) {
            code = state.src.charCodeAt(pos);
            if (!isSpace(code) && code !== 0x0A) { break; }
        }
        if (pos >= max) { return false; }

        // [link](  <hash>  )
        //          ^^^^^^ parsing link destination
        res = state.md.helpers.parseLinkDestination(state.src, pos, state.posMax);
        if (res.ok) {
            hash = state.md.normalizeLink(res.str);
            if (state.md.validateLink(hash)) {
                pos = res.pos;
            } else {
                hash = '';
            }
        }

        // [link](  <hash>  )
        //                ^^ skipping these spaces
        for (; pos < max; pos++) {
            code = state.src.charCodeAt(pos);
            if (!isSpace(code) && code !== 0x0A) { break; }
        }

        if (pos >= max || state.src.charCodeAt(pos) !== 0x29/* ) */) {
            state.pos = oldPos;
            return false;
        }
        pos++;
    } else {
        //
        // Link reference
        //
        if (typeof state.env.references === 'undefined') { return false; }

        if (pos < max && state.src.charCodeAt(pos) === 0x5B/* [ */) {
            start = pos + 1;
            pos = state.md.helpers.parseLinkLabel(state, pos);
            if (pos >= 0) {
                label = state.src.slice(start, pos++);
            } else {
                pos = labelEnd + 1;
            }
        } else {
            pos = labelEnd + 1;
        }

        // covers label === '' and label === undefined
        // (collapsed reference link and shortcut reference link respectively)
        if (!label) { label = state.src.slice(labelStart, labelEnd); }

        ref = state.env.references[normalizeReference(label)];
        if (!ref) {
            state.pos = oldPos;
            return false;
        }
        hash = ref.href;
        title = ref.title;
    }

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    if (!silent) {
        content = state.src.slice(labelStart, labelEnd);

        state.md.inline.parse(
            content,
            state.md,
            state.env,
            tokens = []
        );

        token          = state.push('transclusion', tag, 0);
        token.attrs    = attrs = [ [ 'hash', hash ] ];
        token.children = tokens;
        token.content  = content;

        if (title) {
            attrs.push([ 'title', title ]);
        }
    }

    state.pos = pos;
    state.posMax = max;
    return true;
}

export default function transclusion_plugin(md, options) {
    options = options || {}
    md.inline.ruler.after('escape', 'transclusion', transclusion);
}