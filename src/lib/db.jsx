import mysql from "mysql2/promise";

// ⚠️ En Node, globalThis funciona igual que global
if (!global.pool) {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error("Variables de entorno de MySQL no definidas");
  }

  global.pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log("Pool de MySQL creado ✅");
}

// Exportamos nombrado para seguir usando { pool } en tus APIs
export const pool = global.pool;
