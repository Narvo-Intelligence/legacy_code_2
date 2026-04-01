import React from 'react';

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'app' | 'landing' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export const ButtonPrimary: React.FC<ButtonBaseProps> = ({ 
  children, icon, size = 'app', fullWidth, className = '', ...props 
}) => {
  const sizeClass = size === 'landing' ? 'h-btn-landing px-8 text-lg' : 'h-btn-app px-6 text-base';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`inline-flex items-center justify-center font-body font-semibold rounded-full bg-narvo-vermilion text-white hover:bg-[#d94420] focus:ring-2 focus:ring-offset-2 focus:ring-narvo-teal transition-lift ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className={children ? "mr-2" : ""}>{icon}</span>}
      {children}
    </button>
  );
};

export const ButtonSecondary: React.FC<ButtonBaseProps> = ({ 
  children, icon, size = 'md', fullWidth, className = '', ...props 
}) => {
  const sizeClass = size === 'lg' ? 'h-[52px] px-6 text-base' : 'h-12 px-5 text-base';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`inline-flex items-center justify-center font-body font-medium rounded-xl bg-white text-narvo-ink border border-border-subtle hover:bg-narvo-mist focus:ring-2 focus:ring-offset-2 focus:ring-narvo-teal transition-lift ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className={children ? "mr-2" : ""}>{icon}</span>}
      {children}
    </button>
  );
};

export const ButtonGhost: React.FC<ButtonBaseProps> = ({ 
  children, icon, size = 'md', fullWidth, className = '', ...props 
}) => {
  const sizeClass = size === 'sm' ? 'h-11 px-4 text-sm' : 'h-12 px-5 text-base';
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`inline-flex items-center justify-center font-body font-medium rounded-lg bg-transparent text-content-secondary hover:text-narvo-ink hover:bg-black/5 focus:ring-2 focus:ring-offset-2 focus:ring-border-subtle transition-toggle ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {icon && <span className={children ? "mr-2" : ""}>{icon}</span>}
      {children}
    </button>
  );
};

type ButtonIconProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'white' | 'mist' | 'vermilion' | 'ghost';
};

export const ButtonIcon: React.FC<ButtonIconProps> = ({ 
  icon, size = 'md', variant = 'mist', className = '', ...props 
}) => {
  const sizeClass = size === 'sm' ? 'h-11 w-11' : size === 'lg' ? 'h-[60px] w-[60px]' : 'h-[52px] w-[52px]';
  
  let variantClass = '';
  switch (variant) {
    case 'vermilion':
      variantClass = 'bg-narvo-vermilion text-white hover:bg-[#d94420] focus:ring-narvo-teal';
      break;
    case 'white':
      variantClass = 'bg-white text-narvo-ink border border-border-subtle hover:bg-narvo-mist focus:ring-narvo-teal';
      break;
    case 'ghost':
      variantClass = 'bg-transparent text-content-secondary hover:bg-black/5 hover:text-narvo-ink focus:ring-border-subtle';
      break;
    case 'mist':
    default:
      variantClass = 'bg-narvo-mist text-narvo-ink hover:bg-black/10 focus:ring-narvo-teal';
      break;
  }

  return (
    <button 
      className={`inline-flex items-center justify-center rounded-full transition-lift focus:ring-2 focus:ring-offset-2 ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
