import React from "react"

class Artifact extends React.Component {
    render() {
        const {name, attributes} = this.props
        return <main {...attributes}>
            <header>{name}</header>
            <hr />
            {this.props.children}
        </main>
    }
}

export default Artifact