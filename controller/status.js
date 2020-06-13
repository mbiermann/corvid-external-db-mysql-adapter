const Schema = require('../service/schema')

exports.getStatus = async (req, res) => {
  const findResult = await Schema.list(req.body)
  if (!findResult.schemas) {
      throw new Error("No schemas found on database connection")
  } else {
      res.status(200).json({server: "ok", db: "ok"})
  }
}