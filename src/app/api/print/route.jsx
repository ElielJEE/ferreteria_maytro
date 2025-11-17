import net from "net";

export async function POST(req) {
	try {
		const body = await req.json();

		const ip = body.ip;          // Ejemplo: "192.168.1.150"
		const escpos = body.data;   // Comandos ESC/POS en formato string

		await sendToPrinter(ip, escpos);

		return Response.json({ ok: true });
	} catch (err) {
		console.error("Error imprimiendo:", err);
		return Response.json({ ok: false, error: err.message }, { status: 500 });
	}
}

function sendToPrinter(ip, data) {
	return new Promise((resolve, reject) => {
		const client = new net.Socket();

		client.connect(9100, ip, () => {
			client.write(data, () => {
				client.end();
				resolve();
			});
		});

		client.on("error", reject);
	});
}
