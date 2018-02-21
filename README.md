# prototypical

Prototypical is a decentralized note-taking application. 
You can type things, save them, share them, and organize them.

You can use markdown to make headers and style text, and also embed images with `![alt text](image url)`. That's pretty cool. 
You can also save your work (with `Ctrl+S` or `Cmd-S`), which changes the URL to be some scary hash thing. 
Then if you share that URL with someone else, they'll see the content that you saved by asking your computer for it! You can also open another hash with `Cmd-O` or `Ctrl-O`, or just by pasting the hash into the url bar.
It's magic.

You can also collaborate! `Cmd-Shift-S` displays your document id, and `Cmd-Shift-O` lets you join others' documents by pasting in their id. *For now, you can't collaborate between two windows on the same computer - only between two physically different computers*. I could change that, but it would break other things that I like having around more.

The content that gets persisted to IFPS is actually pure HTML (i.e. not markdown, `"# Hello" => <h1>Hello</h1>`) so when [js-ipfs](https://github.com/ipfs/js-ipfs) finishes [circuit relays](https://github.com/ipfs/js-ipfs/pull/1063) you can just `cat` a hash from the terminal or visit read-only pure-html content at an IPFS gateway (e.g. `https://gateway.ipfs.io/ipfs/<hash>`). Exciting times!
