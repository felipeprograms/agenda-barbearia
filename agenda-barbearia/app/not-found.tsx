import BrandBar from "@/components/BrandBar";

export default function NotFound() {
  return (
    <div className="container stack-lg">
      <BrandBar />
      <header className="hero">
        <h1>Página não encontrada</h1>
        <p>Confira o endereço do link com a sua barbearia. Ele deve ser algo como /nome-da-barbearia.</p>
        <div className="rule" />
      </header>
    </div>
  );
}
