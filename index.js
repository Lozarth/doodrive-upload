const express = require('express')
const fetch = require('node-fetch-commonjs')
const fileUpload = require('express-fileupload')

const app = express()

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}))

app.post('/upload', async function (req, res) {
    if (!req.files) return res.status(400).send('No files provided')

    const apiKey = req.headers['api_key']
    const apiToken = req.headers['api_token']

    if (!apiKey || !apiToken) return res.status(400).send('No API_KEY or API_TOKEN provided')

    const file = Object.values(req.files)[0]

    // Start upload and get upload vars
    const uploadForm = new FormData()
    uploadForm.append('api_key', apiKey)
    uploadForm.append('api_token', apiToken)
    uploadForm.append('file_size', file.size)
    uploadForm.append('file_name', file.name)

    const upload = await fetch('https://doodrive.com/api/v1/upload', {
        method: 'POST',
        body: uploadForm
    })
    if (upload.status !== 200) return res.status(500).send('Unable to start upload')

    const uploadJson = await upload.json()

    if (uploadJson.status !== 'success') return res.status(500).send('Failed to upload')
    
    const { token, chunk_url, max_chunk_size, max_file_size, complete_url } = uploadJson.data

    if (file.size > max_file_size) return res.status(400).send('File size too big')

    const chunks = Math.ceil(file.size / max_chunk_size)
    let chunkId = 0

    for (let start = 0; start < file.size; start += max_chunk_size) {
        const chunk = file.data.slice(start, start + max_chunk_size)

        const chunkBlob = new Blob([chunk])

        const chunkForm = new FormData()
        chunkForm.append('api_key', apiKey)
        chunkForm.append('api_token', apiToken)
        chunkForm.append('token', token)
        chunkForm.append('chunk_id', chunkId)
        chunkForm.append('file', chunkBlob)

        const chunkResponse = await fetch(chunk_url, {
            method: 'POST',
            body: chunkForm
        })

        if (chunkResponse.status !== 200) return res.status(400).send(`Failed to upload chunk number: ${chunkId}.`)

        chunkId++
    }

    // Complete upload
    const completeUploadForm = new FormData()
    completeUploadForm.append('api_key', apiKey)
    completeUploadForm.append('api_token', apiToken)
    completeUploadForm.append('token', token)
    completeUploadForm.append('chunks', chunks)

    const completeUpload = await fetch(complete_url, {
        method: 'POST',
        body: completeUploadForm,
        timeout: 600000
    })

    if (completeUpload.status !== 200) return res.status(400).send('Unable to complete upload')

    res.status(200).send(`${file.name} uploaded successfully`)
})

app.listen(80, function () {
    console.log('Express listening on port 80')
})