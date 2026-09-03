import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconRendererProps {
  name?: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name = 'Tag',
  className = 'w-5 h-5',
  size = 20,
}) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Tag;
  return <IconComponent className={className} size={size} />;
};
