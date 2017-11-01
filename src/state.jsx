import React from "react"
import schema from "./schema.js"
import {key} from "./utils.js"

import serializer from "./serialize.jsx"

// const text = localStorage.hasOwnProperty(key) ? localStorage.getItem(key) : ""

// const value = Plain.deserialize(text)

const value = serializer.deserialize("<h1>Hello</h1><p>hi there</p>")

window.serializer = serializer

export default {value, schema}