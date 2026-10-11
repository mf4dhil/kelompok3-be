import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

const db = new Sequelize(
  process.env.DB_NAME || "nifacake",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: process.env.DB_DIALECT || "mysql",
    logging: false,
  },
);

export default db;
