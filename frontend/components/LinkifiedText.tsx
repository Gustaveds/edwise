import React from 'react';

interface LinkifiedTextProps {
  children: React.ReactNode;
}

const LinkifiedText: React.FC<LinkifiedTextProps> = ({ children }) => {
  const linkifyText = (text: string): React.ReactNode[] => {
    if (!text || typeof text !== 'string') return [text];

    // Regex MUITO mais abrangente - detecta qualquer coisa que pareça URL ou caminho
    const URL_REGEX = /(https?:\/\/[^\s<>]+|[\w.-]+\/edwise\/videos\/[^\s<>]+)/gi;

    const parts = text.split(URL_REGEX);

    return parts.map((part, index) => {
      if (!part || !part.trim()) {
        return null;
      }

      const cleanPart = part.trim();

      // Tentar detectar se é uma URL ou caminho
      if (cleanPart.match(URL_REGEX)) {
        // Detectar se é um vídeo do sistema MinIO ou caminho local
        const isMinIOVideo = cleanPart.includes('s3.tgbia.com/edwise/videos/') || cleanPart.includes('/edwise/videos/');

        // Detectar se é URL malformada (começa com undefined)
        const isMalformedURL = cleanPart.startsWith('undefined/');

        // Extrair timestamp se existir (?t=XmYs, &t=XmYs, ou até sem separador)
        const timestampMatch = cleanPart.match(/[?&]?t=(\d+m\d+s)/);
        const timestamp = timestampMatch ? timestampMatch[1] : null;

        // SEMPRE fazer link clicável (mesmo malformadas, para teste)
        let linkColor = 'text-blue-600 dark:text-blue-400';
        let linkTitle = 'Abrir vídeo';

        if (isMalformedURL) {
          linkColor = 'text-orange-600 dark:text-orange-400'; // Laranja para URLs antigas
          linkTitle = 'URL antiga - clique para testar';
        }

        if (timestamp) {
          linkTitle = `Abrir vídeo em ${timestamp}`;
        }

        return (
          <a
            key={`link-${index}`}
            href={cleanPart}
            onClick={(e) => {
              console.log('Link clicado:', cleanPart);
              // Para QUALQUER link de vídeo, tentar navegar
              if (isMinIOVideo || isMalformedURL) {
                e.preventDefault();
                // Tentar abrir de qualquer forma
                window.open(cleanPart, '_self');
              }
            }}
            className={`${linkColor} underline hover:no-underline transition-all cursor-pointer font-semibold break-all hover:opacity-80`}
            title={linkTitle}
          >
            {cleanPart}
          </a>
        );
      }

      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  const processChildren = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') {
      const linkified = linkifyText(node);
      // Filtrar nulls
      return linkified.filter(item => item !== null);
    }
    if (React.isValidElement(node) && node.props.children) {
      return React.cloneElement(node, {
        children: processChildren(node.props.children),
      } as any);
    }
    if (Array.isArray(node)) {
      return node.flatMap((child, i) => {
        const processed = processChildren(child);
        if (Array.isArray(processed)) {
          return processed
            .filter(p => p !== null)
            .map((p, j) => (
              <React.Fragment key={`${i}-${j}`}>{p}</React.Fragment>
            ));
        }
        return processed !== null ? (
          <React.Fragment key={i}>{processed}</React.Fragment>
        ) : null;
      }).filter(item => item !== null);
    }
    return node;
  };

  return (
    <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words leading-relaxed">
      {processChildren(children)}
    </p>
  );
};

export default LinkifiedText;
