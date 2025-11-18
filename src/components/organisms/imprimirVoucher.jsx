export const imprimirVoucher = async (data) => {
  try {
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Error imprimiendo voucher");
  } catch (err) {
    console.error("Error frontend:", err);
  }
};
