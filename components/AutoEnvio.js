'use client';
// <select> que envía su formulario al cambiar (para mover oportunidades de etapa, filtros, etc.)
export default function AutoEnvio({ children, ...props }) {
  return (
    <select {...props} onChange={(e) => e.currentTarget.form.requestSubmit()}>
      {children}
    </select>
  );
}
