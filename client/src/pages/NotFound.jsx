import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="panel">
      <h2 style={{ marginTop:0 }}>404</h2>
      <p style={{ color:"var(--muted)" }}>Сторінка не знайдена.</p>
      <Link className="btn btnPrimary" to="/collection">До колекції</Link>
    </div>
  );
}