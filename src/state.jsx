import React from "react"
import schema from "./schema.js"
import {key} from "./utils.js"

import serializer from "./serialize.jsx"

window.serializer = serializer

const text = localStorage.hasOwnProperty(key) ? localStorage.getItem(key) : ""
// console.log("text", text)
const value = serializer.deserialize(text)
// console.log("value", value)
// const value = serializer.deserialize("<h1>Hello</h1><p>hi there</p>")

export default {value, schema}