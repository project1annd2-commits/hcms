import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white">
      <div className="flex border-b border-gray-200 bg-gray-50 p-1 gap-1">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Underline"
        >
          <Underline size={16} />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 my-auto"></div>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('insertUnorderedList'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); execCommand('insertOrderedList'); }}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-3 min-h-[100px] outline-none max-h-[300px] overflow-y-auto prose max-w-none text-sm richtext-editor"
        data-placeholder={placeholder}
      />
    </div>
  );
}
