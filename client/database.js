const mysql = require('mysql')

const poolConfig = JSON.parse(process.env.SQL_CONFIG);
poolConfig.connectionLimit = 50
let pool  = mysql.createPool(poolConfig);

exports.select = (table, clause = '', sortClause = '', skip = 0, limit = 1) =>
  query(
    `SELECT * FROM ${table} ${clause} ${sortClause} LIMIT ${skip}, ${limit}`,
    {},
    identity => identity
  )

const insert = (table, item) =>
  query(`INSERT INTO ${table} SET ?`, item, () => item)

exports.insert = insert

exports.insertMany = (table, items) =>
    new Promise((resolve, reject) => {
        let proms = []
        for (let i of items) {
            let prom = insert(table, i)
            proms.push(prom)
        }
        Promise.all(proms).then( result => {
            resolve(items.length)
        }).catch( error => {
            reject(error)
        })
    })

exports.update = (table, item) =>
  query(
    `UPDATE ${table} SET ? WHERE _id = ${pool.escape(item._id)}`,
    item,
    () => item
  )

exports.deleteOne = (table, itemId) =>
  query(
    `DELETE FROM ${table} WHERE _id = ${pool.escape(itemId)}`,
    {},
    result => result.affectedRows
  )

exports.deleteMany = (table, itemIds) => {
    let ids = []
    for (let i of itemIds) {
        ids.push(pool.escape(i))
    }
    let idsList = ids.join(',')
    return query(
        `DELETE FROM ${table} WHERE _id IN (${idsList})`,
        itemIds,
        result => result.affectedRows
    )
}

exports.count = (table, clause) =>
  query(
    `SELECT COUNT(*) FROM ${table} ${clause}`,
    {},
    result => result[0]['COUNT(*)']
  )

exports.describeDatabase = () =>
  query('SHOW TABLES', {}, async result => {
    const tables = result.map(entry => entry[`Tables_in_${poolConfig.database}`])

    return Promise.all(
      tables.map(async table => {
        const columns = await describeTable(table)

        return {
          table,
          columns
        }
      })
    )
  })

const describeTable = table =>
  query(`DESCRIBE ${table}`, {}, result => {
    return result.map(entry => {
      return {
        name: entry['Field'],
        type: entry['Type'],
        isPrimary: entry['Key'] === 'PRI'
      }
    })
  })

const query = (query, values, handler) =>
  new Promise((resolve, reject) => {
    pool.query(query, values, (err, results, fields) => {
      if (err) {
        console.log(err);
        reject(err)
      }

      resolve(handler(results, fields))
    })
  })
