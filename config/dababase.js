import { Sequelize } from "sequelize";

const db = new Sequelize("nifacake", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
} )

export default db;