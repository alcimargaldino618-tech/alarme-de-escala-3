import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1>ALARME DE ESCALA</h1>
      <p>Aplicativo carregado corretamente.</p>
    </div>
  );
}
