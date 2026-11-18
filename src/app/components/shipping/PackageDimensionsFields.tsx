import React from 'react';
import { Input } from '../ui/input';
import {
  PackageDimensionInputs,
  parsePackageDimensions,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../../utils/packageDimensions';

interface PackageDimensionsFieldsProps {
  values: PackageDimensionInputs;
  onChange: (next: PackageDimensionInputs) => void;
  compact?: boolean;
}

export function PackageDimensionsFields({
  values,
  onChange,
  compact = false,
}: PackageDimensionsFieldsProps) {
  const inputHeightClass = compact ? 'h-7 text-xs' : 'h-8 text-xs';
  const parsed = parsePackageDimensions(values);
  const sumSides = parsed.height + parsed.width + parsed.length;
  const exceedsCorreiosMax =
    parsed.weight > 30 ||
    parsed.height > 100 ||
    parsed.width > 100 ||
    parsed.length > 100 ||
    sumSides > 200;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        <div>
          <span className="text-[10px] text-muted-foreground">Peso (kg)</span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 0.3"
            className={inputHeightClass}
            value={values.weight}
            onChange={(e) => onChange({ ...values, weight: sanitizeDecimalInput(e.target.value) })}
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Alt (cm)</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: 6"
            className={inputHeightClass}
            value={values.height}
            onChange={(e) => onChange({ ...values, height: sanitizeIntegerInput(e.target.value) })}
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Larg (cm)</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: 16"
            className={inputHeightClass}
            value={values.width}
            onChange={(e) => onChange({ ...values, width: sanitizeIntegerInput(e.target.value) })}
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Comp (cm)</span>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ex: 20"
            className={inputHeightClass}
            value={values.length}
            onChange={(e) => onChange({ ...values, length: sanitizeIntegerInput(e.target.value) })}
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        <strong>Limites padrão:</strong> PAC/SEDEX até 30 kg, máx. 100 cm por lado e soma (A+L+C) até 200 cm. Mini Envios até 0,3 kg e máx. 4×16×24 cm.
      </p>

      {exceedsCorreiosMax && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
          Atenção: as dimensões ou peso informados ultrapassam o limite padrão dos Correios (soma atual: {sumSides} cm). Algumas transportadoras podem ficar indisponíveis.
        </p>
      )}
    </div>
  );
}
