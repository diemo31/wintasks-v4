import { useState, useCallback } from 'react';

const API_BASE = 'https://d3e6htiiul5ek9.cloudfront.net/prod';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function usePreciosClaros() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [prices, setPrices] = useState([]);

  const scanBarcode = useCallback(async (ean, latitude, longitude) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setPrices([]);

    try {
      const sucUrl = `${API_BASE}/sucursales?lat=${latitude}&lng=${longitude}&limit=50`;
      const sucData = await fetchJson(sucUrl);
      const sucursales = sucData?.sucursales || [];
      if (sucursales.length === 0) {
        setError('No se encontraron sucursales cercanas');
        setLoading(false);
        return;
      }

      const sucIds = sucursales.map(s => s.id).join(',');
      const prodUrl = `${API_BASE}/producto?limit=30&id_producto=${ean}&array_sucursales=${sucIds}`;
      const prodData = await fetchJson(prodUrl);

      if (!prodData?.producto || prodData.producto.msg === 'Producto inexistente.') {
        setError('Producto no encontrado en los comercios cercanos');
        setLoading(false);
        return;
      }

      const prod = prodData.producto;
      setProduct({
        nombre: prod.nombre || 'Producto',
        marca: prod.marca || '',
        presentacion: prod.presentacion || '',
        ean,
      });

      const stores = prodData.sucursales || [];
      const precios = stores
        .filter(s => {
          const p = s.preciosProducto;
          return p && (p.precioLista != null || p.precio != null);
        })
        .map(s => {
          const dist = calcularDistancia(
            latitude, longitude,
            parseFloat(s.lat), parseFloat(s.lng)
          );
          const p = s.preciosProducto;
          const precioLista = p.precioLista != null ? p.precioLista : p.precio;
          let promoA = null;
          if (p.promo1 && p.promo1.precio) {
            const val = parseFloat(p.promo1.precio);
            if (!isNaN(val)) promoA = val;
          }
          return {
            sucursalId: s.id,
            comercio: s.banderaDescripcion || '',
            direccion: s.direccion || '',
            distancia: dist,
            precioLista,
            precioPromoA: promoA,
          };
        })
        .sort((a, b) => a.distancia - b.distancia);

      if (precios.length === 0) {
        setError('Producto sin precio disponible en los comercios cercanos');
        setLoading(false);
        return;
      }

      setPrices(precios);
    } catch (e) {
      setError('Error al consultar precios. Intentalo de nuevo.');
    }
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setProduct(null);
    setPrices([]);
  }, []);

  return { loading, error, product, prices, scanBarcode, reset };
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (isNaN(lat2) || isNaN(lon2)) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
