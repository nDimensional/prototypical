# prototypical

Prototypical is a decentralized note-taking application. 
You can type things, save them, share them, and organize them.

You can use markdown to make headers and style text. That's pretty cool. 
You can also save your work (with Ctrl+S or Cmd-S), which changes the URL to be some scary hash thing. 
Then if you share that URL with someone else, they'll see the content that you saved by asking your computer for it! 
It's magic.

You can embed images like normal markdown with `![alt text](image url)`. You can also embed other prototypical pages with `@[alt text](hash)`, where `hash` is just the scary part of the url after you save something. Pretty wild.

The content that gets persisted to IFPS is actually pure HTML (i.e. not markdown, `"# Hello" => <h1>Hello</h1>`) so when [js-ipfs](https://github.com/ipfs/js-ipfs) finishes [circuit relays](https://github.com/ipfs/js-ipfs/pull/1063) you can just `cat` a hash from the terminal or visit read-only pure-html content at an IPFS gateway (e.g. `https://gateway.ipfs.io/ipfs/<hash>`). Exciting times!
