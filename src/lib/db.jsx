import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
