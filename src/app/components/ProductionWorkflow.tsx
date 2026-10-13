import { ProductionStep, ProductionWorkflow } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Palette,
  CheckCircle2,
  Printer,
  Scissors,
  Hammer,
  Shield,
  Package,
  Circle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from './ui/utils';

interface ProductionWorkflowProps {
  workflow?: ProductionWorkflow;
  onUpdateStep?: (step: ProductionStep, completed: boolean) => void;
  readonly?: boolean;
}

const PRODUCTION_STEPS: Array<{
  key: ProductionStep;
  label: string;
  icon: typeof Palette;
  color: string;
}> = [
  { key: 'design', label: 'Design', icon: Palette, color: 'text-purple-600' },
  { key: 'approval', label: 'Aprovação', icon: CheckCircle2, color: 'text-blue-600' },
  { key: 'printing', label: 'Impressão', icon: Printer, color: 'text-indigo-600' },
  { key: 'cutting', label: 'Corte', icon: Scissors, color: 'text-orange-600' },
  { key: 'assembly', label: 'Montagem', icon: Hammer, color: 'text-amber-600' },
  { key: 'quality-check', label: 'Controle de Qualidade', icon: Shield, color: 'text-green-600' },
  { key: 'packaging', label: 'Embalagem', icon: Package, color: 'text-teal-600' },
];

export function ProductionWorkflowComponent({ workflow, onUpdateStep, readonly = false }: ProductionWorkflowProps) {
  const completedSteps = workflow
    ? Object.entries(workflow.steps).filter(([_, step]) => step.completed).length
    : 0;
  const totalSteps = PRODUCTION_STEPS.length;
  const progress = (completedSteps / totalSteps) * 100;

  const handleStepToggle = (stepKey: ProductionStep) => {
    if (readonly || !onUpdateStep) return;
    const isCompleted = workflow?.steps[stepKey]?.completed || false;
    onUpdateStep(stepKey, !isCompleted);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrentStepIndex = () => {
    if (!workflow) return -1;
    return PRODUCTION_STEPS.findIndex(step => step.key === workflow.currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Workflow de Produção</CardTitle>
          <Badge variant={completedSteps === totalSteps ? 'default' : 'secondary'}>
            {completedSteps}/{totalSteps} concluídas
          </Badge>
        </div>
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {PRODUCTION_STEPS.map((step, index) => {
            const stepData = workflow?.steps[step.key];
            const isCompleted = stepData?.completed || false;
            const isCurrent = currentStepIndex === index;
            const isNext = !isCompleted && index === currentStepIndex + 1;
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 transition-all',
                  isCompleted && 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                  isCurrent && !isCompleted && 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
                  isNext && 'border-amber-200 dark:border-amber-800',
                  !isCompleted && !isCurrent && !isNext && 'border-border'
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  {!readonly && onUpdateStep ? (
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleStepToggle(step.key)}
                      className="size-5"
                    />
                  ) : (
                    <div className="size-5 flex items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle className="size-5 text-green-600" />
                      ) : isCurrent ? (
                        <Clock className="size-5 text-blue-600" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('size-4', step.color)} />
                    <h4 className="font-semibold">{step.label}</h4>
                    {isCurrent && !isCompleted && (
                      <Badge variant="outline" className="ml-auto">
                        Em andamento
                      </Badge>
                    )}
                    {isNext && (
                      <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200">
                        Próxima
                      </Badge>
                    )}
                  </div>

                  {stepData?.completedAt && (
                    <div className="text-xs text-muted-foreground">
                      Concluído em {formatDate(stepData.completedAt)}
                      {stepData.completedBy && ` por ${stepData.completedBy}`}
                    </div>
                  )}

                  {stepData?.notes && (
                    <div className="mt-2 text-sm text-muted-foreground bg-background p-2 rounded border">
                      {stepData.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {workflow?.estimatedCompletionDate && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Previsão de conclusão:</span>
              <span className="font-semibold">
                {new Date(workflow.estimatedCompletionDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {workflow?.startedAt && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Iniciado em {formatDate(workflow.startedAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
