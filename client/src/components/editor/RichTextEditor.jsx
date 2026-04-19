import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    ImagePlus,
    Undo,
    Redo,
    Strikethrough,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export default function RichTextEditor({ content, onChange, placeholder }) {
    const fileInputRef = useRef(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'editor-image',
                },
            }),
        ],
        content: content || '',
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none',
                'data-placeholder': placeholder || 'Rapor içeriğini yazın...',
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (items) {
                    for (const item of items) {
                        if (item.type.startsWith('image/')) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    view.dispatch(
                                        view.state.tr.replaceSelectionWith(
                                            view.state.schema.nodes.image.create({
                                                src: e.target.result,
                                            })
                                        )
                                    );
                                };
                                reader.readAsDataURL(file);
                            }
                            return true;
                        }
                    }
                }
                return false;
            },
        },
    });

    // Sync content from parent when it changes externally (e.g. loading existing report)
    useEffect(() => {
        if (editor && content !== undefined && editor.getHTML() !== content) {
            editor.commands.setContent(content || '', false);
        }
    }, [editor, content]);

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (e) => {
            const file = e.target.files?.[0];
            if (!file || !editor) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                editor.chain().focus().setImage({ src: ev.target.result }).run();
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        },
        [editor]
    );

    if (!editor) return null;

    const ToolButton = ({ onClick, active, children, title }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition-colors ${active
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="tiptap-editor border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Kalın"
                >
                    <Bold size={15} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="İtalik"
                >
                    <Italic size={15} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Altı Çizili"
                >
                    <UnderlineIcon size={15} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')}
                    title="Üstü Çizili"
                >
                    <Strikethrough size={15} />
                </ToolButton>
                <div className="w-px h-5 bg-slate-200 mx-1.5" />
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Liste"
                >
                    <List size={15} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Numaralı Liste"
                >
                    <ListOrdered size={15} />
                </ToolButton>
                <div className="w-px h-5 bg-slate-200 mx-1.5" />
                <ToolButton onClick={addImage} title="Resim Ekle">
                    <ImagePlus size={15} />
                </ToolButton>
                <div className="w-px h-5 bg-slate-200 mx-1.5" />
                <ToolButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Geri Al"
                >
                    <Undo size={15} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="İleri Al"
                >
                    <Redo size={15} />
                </ToolButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
}
