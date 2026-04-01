import React from 'react';

export interface NarvoLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  alt?: string;
}

const NarvoLogo = ({ className = '', alt = '', ...props }: NarvoLogoProps) => (
  <span
    className={`inline-flex shrink-0 text-primary ${className}`}
    role="img"
    aria-hidden={!alt}
    aria-label={alt || undefined}
    {...props}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 421 421"
      width="100%"
      height="100%"
      className="w-full h-full"
      fill="currentColor"
    >
      <g transform="matrix(1,0,0,1,-409.97874,-663.915748)">
        <g transform="matrix(0.410366,0,0,0.410366,409.971437,644.210885)">
          <path
            id="upper_shelf"
            d="M731.429,512L800,512L736,736L288,736L224,512L292.571,512L256,384L372.571,384L336,256L688,256L651.429,384L768,384L731.429,512Z"
            fill="currentColor"
          />
          <path
            id="lower_shelf"
            d="M352,768L672,768L640,864L384,864L352,768Z"
            fill="currentColor"
            fillRule="nonzero"
          />
        </g>
      </g>
    </svg>
  </span>
);

export default NarvoLogo;
