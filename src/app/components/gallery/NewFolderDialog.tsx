import React, { useState } from 'react';
import { Customer, Tag } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TagInput } from '../TagInput';
import { FOLDER_COLORS, DEFAULT_FOLDER_COLOR } from './FolderCard';
import { toast } from 'sonner';

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  existingFolderIds: string[];
  onSaved: (folder: {
    customerId: string;
    customerName: string;
    color: string;
    tags: Tag[];
  }) => void;
}

export function NewFolderDialog({
  open,
  onClose,
  customers,
  existingFolderIds,
  onSaved,
}: NewFolderDialogProps) {
  const [customerId, setCustomerId] = useState('');
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [tags, setTags] = useState<Tag[]>([]);

  const available = customers.filter((c) => !existingFolderIds.includes(c.id));

  const reset = () => {
    setCustomerId('');
    setColor(DEFAULT_FOLDER_COLOR);
    setTags([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!customerId) {
      toast.error('Selecione um cliente');
      return;
    }
    const customer = customers.find((c) => c.id === customerId)!;
    onSaved({ customerId: customer.id, customerName: customer.name, color, tags });
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select
              value={customerId || '__none__'}
              onValueChange={(v) => setCustomerId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Selecione —</SelectItem>
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {available.length === 0 && (
              <p className="text-xs text-muted-foreground">Todos os clientes já possuem pasta.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-6 gap-2">
              {FOLDER_COLORS.map((fc) => (
                <button
                  key={fc.value}
                  type="button"
                  title={fc.label}
                  onClick={() => setColor(fc.value)}
                  className="size-8 rounded-full transition-all hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: fc.value,
                    boxShadow:
                      color === fc.value
                        ? `0 0 0 2px white, 0 0 0 3.5px ${fc.value}`
                        : undefined,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!customerId}>
            Criar Pasta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
