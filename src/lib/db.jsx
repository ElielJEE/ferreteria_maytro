import mysql from "mysql2/promise";

const isProd = process.env.NODE_ENV === "production";

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(isProd && {
    ssl: { rejectUnauthorized: false },
  }),
});

export default pool;
