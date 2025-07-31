
const Loading = ({ message = 'Loading...', size = 'medium', fullScreen = false }) => {
  const spinnerClass = `loading-spinner loading-spinner--${size}`;
  const containerClass = fullScreen ? 'loading-container loading-container--fullscreen' : 'loading-container';

  return (
    <div className={containerClass}>
      <div className={spinnerClass}></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default Loading;