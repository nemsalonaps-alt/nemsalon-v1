import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export function createIcon(
  svgContent: React.ReactNode
): React.FC<IconProps> {
  return function Icon({ size = 24, color = 'currentColor', className, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {svgContent}
      </svg>
    );
  };
}

// Base Icon component that can render any icon by name
export interface BaseIconProps extends IconProps {
  name: IconName;
}

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'calendar'
  | 'clock'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'home'
  | 'settings'
  | 'user'
  | 'users'
  | 'plus'
  | 'minus'
  | 'search'
  | 'edit'
  | 'trash'
  | 'copy'
  | 'logout'
  | 'menu'
  | 'more-vertical'
  | 'more-horizontal'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'phone'
  | 'mail'
  | 'map-pin'
  | 'globe'
  | 'credit-card'
  | 'wallet'
  | 'star'
  | 'heart'
  | 'filter'
  | 'sort'
  | 'spinner';
