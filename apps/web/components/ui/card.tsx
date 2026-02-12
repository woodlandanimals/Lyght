import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = true, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-lyght-white text-lyght-black
          border border-lyght-grey-300 rounded-lg
          ${hover ? "hover:bg-lyght-grey-100 transition-colors duration-100" : ""}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
