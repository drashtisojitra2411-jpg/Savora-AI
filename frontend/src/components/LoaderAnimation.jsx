export default function LoaderAnimation({ message = 'Analyzing...' }) {
  return (
    <div className="savora-loader">
      <div className="savora-loader-card animate-pulse">
        <div className="savora-line savora-line-sm" />
        <div className="savora-line savora-line-lg" />
        <div className="savora-line savora-line-md" />
      </div>
      <div className="savora-loader-grid">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="savora-loader-chip animate-pulse" />
        ))}
      </div>
      <p>{message}</p>
    </div>
  );
}
