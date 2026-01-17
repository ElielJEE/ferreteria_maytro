import mysql from "mysql2/promise";

const isProd = process.env.NODE_ENV === "production";

export const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(isProd && {
    ssl: { rejectUnauthorized: false },
  }),
});

export default pool;
