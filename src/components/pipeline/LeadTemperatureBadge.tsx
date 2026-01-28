import { Badge } from '@/components/ui/badge';
import { Flame, ThermometerSun, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeadTemperature } from '@/hooks/use-lead-temperature';

interface LeadTemperatureBadgeProps {
  temperature: LeadTemperature;
  size?: 'sm' | 'default';
  showLabel?: boolean;
}

const temperatureConfig = {
  hot: {
    label: 'Hot',
    icon: Flame,
    className: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    iconClassName: 'text-red-500',
  },
  warm: {
    label: 'Warm',
    icon: ThermometerSun,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    iconClassName: 'text-amber-500',
  },
  cold: {
    label: 'Cold',
    icon: Snowflake,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    iconClassName: 'text-blue-500',
  },
};

export function LeadTemperatureBadge({ temperature, size = 'sm', showLabel = false }: LeadTemperatureBadgeProps) {
  const config = temperatureConfig[temperature];
  const Icon = config.icon;
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 font-medium',
        badgeSize,
        config.className
      )}
    >
      <Icon className={cn(iconSize, config.iconClassName)} />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </Badge>
  );
}
