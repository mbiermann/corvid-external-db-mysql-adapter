require('custom-env').env()

const express = require('express')
const bodyParser = require('body-parser')
const items = require('./controller/items')
const schemas = require('./controller/schemas')
const provision = require('./controller/provision')
const status = require('./controller/status')
const { wrapError, errorMiddleware } = require('./utils/error-middleware')
const authMiddleware = require('./utils/auth-middleware')

const app = express()
const port = process.env.PORT || 8080

app.use(bodyParser.json())

app.get('/status', wrapError(status.getStatus))

app.use(authMiddleware)

app.post('/schemas/find', wrapError(schemas.findSchemas))
app.post('/schemas/list', wrapError(schemas.listSchemas))
app.post('/data/find', wrapError(items.findItems))
app.post('/data/get', wrapError(items.getItem))
app.post('/data/insert', wrapError(items.insertItem))
app.post('/data/bulkInsert', wrapError(items.insertItems))
app.post('/data/update', wrapError(items.updateItem))
app.post('/data/remove', wrapError(items.removeItem))
app.post('/data/bulkRemove', wrapError(items.bulkRemoveItems))
app.post('/data/count', wrapError(items.countItems))
app.post('/provision', wrapError(provision.provision))

app.use(errorMiddleware)

app.listen(port, () => console.log(`MySQL adapter listening on port ${port}!`))
