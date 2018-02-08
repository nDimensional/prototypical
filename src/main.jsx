import React, { Component } from "react"
import "babel-polyfill"
import { render } from "react-dom"
import { Value } from "../../slate/packages/slate"
import { Editor } from "../../slate/packages/slate-react"

import { html } from "./serialize.jsx"

class App extends Component {
	constructor(props) {
		super(props)
		const value = Value.create(html.deserialize("<p></p>").toJS()) // what is happening?
		this.state = { value }
	}
	render() {
		const { value } = this.state
		return <Editor value={value} onChange={props => this.onChange(props)} />
	}
	onChange(change) {
		// this.setState({ value: change.value })
	}
}

const container = document.querySelector("main")
const component = <App />

render(component, container)
