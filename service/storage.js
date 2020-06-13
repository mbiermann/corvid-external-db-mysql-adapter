const uuid = require('uuid/v4')
const BadRequestError = require('../model/error/bad-request')
const NotFoundError = require('../model/error/not-found')

const { parseFilter } = require('./support/filter-parser')
const { parseSort } = require('./support/sort-parser')
const {
  select,
  count,
  insert,
  insertMany,
  update,
  deleteOne,
  deleteMany
} = require('../client/database')

exports.find = async payload => {
  const { collectionName, filter, sort, skip, limit } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!skip && skip !== 0)
    throw new BadRequestError('Missing skip in request body')
  if (!limit) throw new BadRequestError('Missing limit in request body')

  const parsedFilter = parseFilter(filter)

  const [itemsRaw, totalCount] = await Promise.all([
    select(
      collectionName,
      parsedFilter,
      parseSort(sort),
      skip,
      limit
    ),
    count(collectionName, parsedFilter)
  ]);

  const items = itemsRaw.map(wrapDates)

  return { items, totalCount }
}

exports.get = async payload => {
  const { collectionName, itemId } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!itemId) throw new BadRequestError('Missing itemId in request body')

  const item = (await select(collectionName, `WHERE _id = '${itemId}'`))
    .map(wrapDates)
    .shift()

  if (!item) {
    throw new NotFoundError(`Item with id ${itemId} not found.`)
  }

  return { item }
}

exports.insert = async payload => {

  const { collectionName, item } = payload
  
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!item) throw new BadRequestError('Missing item in request body')

  if (!item._id) item._id = uuid()

  const inserted = wrapDates(await insert(collectionName, extractDates(item), collectionName));

  return { item: inserted }
}

exports.bulkInsert = async payload => {

  const { collectionName, items } = payload
  
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!items) throw new BadRequestError('Missing items list in request body')

    for (let i=0; i < items.length; i++) {
        if (!items[i]._id) items[i]._id = uuid()
        extractDates(items[i])
    }

  const inserted = await insertMany(collectionName, items, collectionName)
  return {
    inserted: inserted,
    updated: 0,
    skipped: 0,
    insertedItemIds: [],
    errors: [],
    removed: 0,
    removedItemIds: []
  }
}

exports.update = async payload => {
  const { collectionName, item } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!item) throw new BadRequestError('Missing item in request body')

  const updated = wrapDates(await update(collectionName, extractDates(item), collectionName));

  return { item: updated }
}

exports.remove = async payload => {
  const { collectionName, itemId } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!itemId) throw new BadRequestError('Missing itemId in request body')

  const item = (await select(collectionName, `WHERE _id = '${itemId}'`))
    .map(wrapDates)
    .shift()
  const itemsChanged = await deleteOne(collectionName, itemId)

  if (!itemsChanged || !item) {
    throw new NotFoundError(`Item with id ${itemId} does not exist.`)
  }

  return { item }
}

exports.bulkRemove = async payload => {
    const { collectionName, itemIds } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')
  if (!itemIds) throw new BadRequestError('Missing itemIds in request body')

  
  const itemsChanged = await deleteMany(collectionName, itemIds)
  if (!itemsChanged) {
    throw new NotFoundError(`Bulk remove entered error.`)
  }

  return {
    inserted: 0,
    updated: 0,
    skipped: 0,
    insertedItemIds: [],
    errors: [],
    removed: itemsChanged,
    removedItemIds: []
  }
}

exports.count = async payload => {
  const { collectionName, filter } = payload
  if (!collectionName)
    throw new BadRequestError('Missing collectionName in request body')

  const totalCount = await count(collectionName, parseFilter(filter))

  return { totalCount }
}

const extractDates = item => {
  Object.keys(item).map(key => {
    const value = item[key];
    if (value === null) return;

    const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;

    if (typeof value === 'object' && '$date' in value) {
      item[key] = new Date(value['$date']);
    }

    if (typeof value === 'string') {
      const re = reISO.exec(value);
      if (re) {
        item[key] = new Date(value);
      }
    }
  })

  return item
}

const wrapDates = item => {
  Object.keys(item)
    .map(key => {
      if (item[key] instanceof Date) {
        item[key] = { $date: item[key] }
      }
    })

  return item
}