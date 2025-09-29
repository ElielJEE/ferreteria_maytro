// src/app/api/productos/route.jsx

let products = [
  // Puedes inicializar aquí con los productos del frontend si quieres
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let filtered = products;

  if (category && category !== 'Todas las categorias') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (status && status !== 'Todos los estados') {
    filtered = filtered.filter(p => {
      if (status === 'Agotados') return p.stock === 0;
      if (status === 'En stock') return p.stock >= 15;
      if (status === 'Bajo stock') return p.stock > 0 && p.stock < 15;
      return true;
    });
  }
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
    );
  }
  return Response.json(filtered);
}

export async function POST(request) {
  const body = await request.json();
  const { id, name, category, stock, purchasePrice, salePrice } = body;
  if (!id || !name || !category) {
    return Response.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  products.push({ id, name, category, stock, purchasePrice, salePrice });
  return Response.json({ message: 'Producto agregado' }, { status: 201 });
}

// Puedes agregar PUT y DELETE si lo necesitas