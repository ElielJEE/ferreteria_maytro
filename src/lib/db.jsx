import mysql from "mysql2/promise";

if (!global.pool) {
  // Chequeo correcto de variables reales
  /* if (
    !process.env.MYSQL_HOST ||
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_PASSWORD ||
    !process.env.MYSQL_DATABASE
  ) {
    throw new Error("Variables de entorno de MySQL no definidas");
  } */

  global.pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log("Pool de MySQL creado ✅");
}

export const pool = global.pool;
