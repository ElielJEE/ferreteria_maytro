'use client'
import { buildVoucher } from "@/utils/buildVoucher";

const imprimirVoucher = async (data) => {
    const escpos = buildVoucher(data);

    await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ip: "192.168.1.150", 
            data: escpos
        })
    });
};
