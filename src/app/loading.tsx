export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <span>Loading MeExercise…</span>
    </div>
  );
}
