import React, { useMemo } from 'react';

interface FormattedDescriptionProps {
  text?: string | null;
  className?: string;
  compact?: boolean;
}

/**
 * Renderiza textos formatados com suporte a:
 * - Parágrafos e quebras de linha (\n\n e \n)
 * - Tópicos com marcadores (-, *, •, – ou numéricos)
 * - Seções/Subtítulos (ex: "✨ Perfeita para:", "Detalhes do produto:")
 * - Negrito (**texto**), Itálico (*texto*)
 * - Emojis e ícones Unicode
 */
export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  text,
  className = '',
  compact = false,
}) => {
  const elements = useMemo(() => {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    // Divide em blocos separados por linha em branco
    const rawBlocks = trimmed.split(/\n\s*\n/);

    return rawBlocks.map((block, bIdx) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return null;

      // Verifica se o bloco é uma lista com marcadores (-, *, •, –, 1., etc.)
      const isBulletList = lines.every((line) => /^[-*•–]\s+/.test(line));
      const isNumberedList = lines.every((line) => /^\d+[.)]\s+/.test(line));

      if (isBulletList) {
        return (
          <ul key={bIdx} className={`space-y-1.5 ${compact ? 'my-1 pl-1' : 'my-2 pl-1.5'}`}>
            {lines.map((line, lIdx) => {
              const cleanContent = line.replace(/^[-*•–]\s+/, '');
              return (
                <li key={lIdx} className="flex items-start gap-2 text-inherit">
                  <span className="inline-block text-primary/70 text-xs mt-0.5 select-none shrink-0">•</span>
                  <span className="flex-1 leading-relaxed">
                    {renderInlineFormatting(cleanContent)}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      }

      if (isNumberedList) {
        return (
          <ol key={bIdx} className={`space-y-1.5 ${compact ? 'my-1 pl-1' : 'my-2 pl-1.5'}`}>
            {lines.map((line, lIdx) => {
              const match = line.match(/^(\d+)[.)]\s+(.*)$/);
              const num = match ? match[1] : `${lIdx + 1}`;
              const cleanContent = match ? match[2] : line;
              return (
                <li key={lIdx} className="flex items-start gap-2 text-inherit">
                  <span className="inline-flex items-center justify-center font-bold text-[10px] text-primary/80 bg-primary/10 rounded-full size-4 mt-0.5 shrink-0 select-none">
                    {num}
                  </span>
                  <span className="flex-1 leading-relaxed">
                    {renderInlineFormatting(cleanContent)}
                  </span>
                </li>
              );
            })}
          </ol>
        );
      }

      // Bloco de texto ou linhas mistas
      return (
        <div key={bIdx} className="space-y-1">
          {lines.map((line, lIdx) => {
            // Se for uma linha isolada de marcador dentro de bloco misto
            if (/^[-*•–]\s+/.test(line)) {
              const cleanContent = line.replace(/^[-*•–]\s+/, '');
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-1.5 py-0.5 text-inherit">
                  <span className="inline-block text-primary/70 text-xs mt-0.5 select-none shrink-0">•</span>
                  <span className="flex-1 leading-relaxed">
                    {renderInlineFormatting(cleanContent)}
                  </span>
                </div>
              );
            }

            // Se for um título/cabeçalho de seção (ex: "### Título" ou "✨ Perfeita para:" ou "Detalhes do produto:")
            const isHeader =
              /^#{1,4}\s+/.test(line) ||
              (/^[^\n]{2,40}:$/.test(line) && !line.includes('http')) ||
              (/^[✨🎀📌💡📦🏷️📏🎨❤️⭐]\s*.+:$/.test(line));

            if (isHeader) {
              const cleanHeader = line.replace(/^#{1,4}\s+/, '');
              return (
                <p
                  key={lIdx}
                  className="font-bold text-foreground pt-1.5 pb-0.5 flex items-center gap-1.5 leading-snug"
                >
                  {renderInlineFormatting(cleanHeader)}
                </p>
              );
            }

            return (
              <p key={lIdx} className="leading-relaxed">
                {renderInlineFormatting(line)}
              </p>
            );
          })}
        </div>
      );
    });
  }, [text, compact]);

  if (!elements) return null;

  return (
    <div className={`formatted-description space-y-2.5 break-words ${className}`}>
      {elements}
    </div>
  );
};

/**
 * Converte **negrito**, *itálico*, links e emojis em nós React estilizados
 */
function renderInlineFormatting(str: string): React.ReactNode[] {
  if (!str) return [];

  // Regex para capturar **bold**, *italic*, e URLs
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*|https?:\/\/[^\s]+)/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    // Negrito: **texto**
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const inner = token.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-foreground">
          {inner}
        </strong>
      );
    }

    // Itálico: *texto*
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      const inner = token.slice(1, -1);
      return (
        <em key={index} className="italic">
          {inner}
        </em>
      );
    }

    // Link URL
    if (/^https?:\/\/[^\s]+$/.test(token)) {
      return (
        <a
          key={index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:opacity-80 break-all"
        >
          {token}
        </a>
      );
    }

    return <React.Fragment key={index}>{token}</React.Fragment>;
  });
}

export default FormattedDescription;
