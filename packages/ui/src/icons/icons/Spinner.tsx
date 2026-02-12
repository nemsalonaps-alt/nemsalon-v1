import { createIcon } from '../Icon.js';

export const Spinner = createIcon(
  <>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="60">
      <animate attributeName="stroke-dashoffset" dur="1.5s" repeatCount="indefinite" from="60" to="0" />
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1.5s" repeatCount="indefinite" />
    </circle>
  </>
);
