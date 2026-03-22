'use client';

import Link from 'next/link';
import {
  BrainCircuit,
  MessageSquareOff,
  History,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyProps {
  title: string;
  description: string;
  icon: React.ElementType;
  button?: string;
  buttonLink?: string;
}

export const EmptyComponent = ({
  title,
  description,
  icon: Icon,
  button,
  buttonLink,
}: EmptyProps) => (
  <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
    <div className="size-16 rounded-3xl bg-secondary/60 flex items-center justify-center">
      <Icon className="size-7 text-muted-foreground/60" />
    </div>
    <div className="space-y-1">
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground max-w-60 leading-relaxed">
        {description}
      </p>
    </div>
    {button && buttonLink && (
      <Link href={buttonLink}>
        <Button size="sm" className="mt-1">
          {button}
        </Button>
      </Link>
    )}
  </div>
);

export const ModelsEmpty = () => (
  <EmptyComponent
    title="Нет моделей"
    description="В данной категории пока нет доступных AI-моделей."
    icon={BrainCircuit}
  />
);

export const ChatsEmpty = () => (
  <EmptyComponent
    title="Нет чатов"
    description="Начните новый диалог с любым AI-ассистентом."
    icon={MessageSquareOff}
    button="Выбрать модель"
    buttonLink="/models"
  />
);

export const GenerationsEmpty = () => (
  <EmptyComponent
    title="Нет генераций"
    description="Вы ещё ничего не создавали. Выберите модель и начните!"
    icon={History}
    button="Начать генерацию"
    buttonLink="/generate"
  />
);
