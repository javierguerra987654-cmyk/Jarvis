import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`prose prose-invert max-w-none text-[#f5f7fa] text-[13.5px] leading-relaxed space-y-2.5 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-[#f5f7fa] border-b border-[#16202c] pb-1 mt-3 mb-2 tracking-wide font-mono uppercase">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-[#00d5ff] mt-3 mb-1.5 font-mono uppercase tracking-wide">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-[#f5f7fa] mt-2 mb-1 uppercase font-mono">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-[#f5f7fa] leading-relaxed font-sans">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1 text-[#f5f7fa] pl-1.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1 text-[#f5f7fa] pl-1.5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[13px] text-[#f5f7fa] leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#f5f7fa]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-[#8b97a5] italic">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#00d5ff] pl-3 py-1 my-2 bg-[#0b1016]/80 text-[#8b97a5] italic rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className && typeof children === 'string' && !children.includes('\n');
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-[#111820] text-[#00d5ff] font-mono text-[12px] border border-[#1e2a38]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-lg bg-[#05070a] border border-[#16202c] overflow-x-auto text-[12px] font-mono text-[#00d5ff] leading-normal shadow-inner">
                <code>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[#16202c]">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#0b1016] text-[#8b97a5] font-mono uppercase text-[10px] border-b border-[#16202c]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#16202c] bg-[#070b10]/80">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold text-[#f5f7fa]">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[#f5f7fa]">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
