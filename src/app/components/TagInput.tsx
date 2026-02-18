import { useState, KeyboardEvent } from 'react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { X } from 'lucide-react';
import { Tag } from '../types';
import { TAG_COLORS, getTextColor } from '../utils/tagColors';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';

interface TagInputProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Digite e pressione Enter...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].value);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTagName = inputValue.trim().toLowerCase();
      if (!tags.some(tag => tag.name === newTagName)) {
        onChange([...tags, { name: newTagName, color: selectedColor }]);
      }
      setInputValue('');
      setShowColorPicker(false);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded-md bg-background">
        {tags.map((tag, index) => (
          <Badge 
            key={index} 
            className="gap-1 pr-1 border-0"
            style={{ 
              backgroundColor: tag.color,
              color: getTextColor(tag.color)
            }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 rounded-sm hover:opacity-70"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="size-6 rounded border-2 border-border hover:scale-110 transition-transform flex-shrink-0"
                style={{ backgroundColor: selectedColor }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-2">
                <div className="text-sm font-medium">Escolha uma cor:</div>
                <div className="grid grid-cols-6 gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className="size-8 rounded border-2 hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: color.value,
                        borderColor: selectedColor === color.value ? '#000' : 'transparent'
                      }}
                      onClick={() => {
                        setSelectedColor(color.value);
                        setShowColorPicker(false);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowColorPicker(false)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="border-0 shadow-none focus-visible:ring-0 flex-1 h-6 px-1"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Clique no círculo colorido para escolher a cor, digite a tag e pressione Enter
      </p>
    </div>
  );
}