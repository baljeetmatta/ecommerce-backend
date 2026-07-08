export default function StatCard({ label, value, helper }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}
