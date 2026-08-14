interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({
  title,
  description,
  children,
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}
