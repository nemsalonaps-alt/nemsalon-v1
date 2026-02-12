export interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Spinner({ size = 24, color = 'currentColor', className = '' }: SpinnerProps) {
  const styles: React.CSSProperties = {
    width: size,
    height: size,
    animation: 'spin 1s linear infinite',
  };

  return (
    <svg
      style={styles}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="60"
      >
        <animate
          attributeName="stroke-dashoffset"
          dur="1.5s"
          repeatCount="indefinite"
          from="60"
          to="0"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
