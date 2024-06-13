import express from 'express'
import fetch from 'node-fetch'

const app = express()

app.get('/upload', async function (req, res) {
    res.send('Hello World!')
})

app.listen(443)