export default function MiniMap({ lat, lng, height = 200 }: { lat: number; lng: number; height?: number }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const dy = 0.0032;
  const dx = 0.0052;
  const bbox = [lng - dx, lat - dy, lng + dx, lat + dy].map((n) => n.toFixed(6)).join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`;
  return (
    <iframe
      title="Mapa da localização"
      src={src}
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ width: "100%", height, border: 0, borderRadius: 12, background: "#1a1a1a" }}
    />
  );
}
