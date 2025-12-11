"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Undo,
  Redo,
} from "lucide-react";
import { useCallback } from "react";

type RichTextEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-purple-600 hover:text-purple-700 underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("bold") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Bold className="h-4 w-4" />
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("italic") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Italic className="h-4 w-4" />
          </button>

          {/* Code */}
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("code") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Code className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-300" />

          {/* Heading 1 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("heading", { level: 1 }) ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Heading1 className="h-4 w-4" />
          </button>

          {/* Heading 2 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("heading", { level: 2 }) ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Heading2 className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-300" />

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("bulletList") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <List className="h-4 w-4" />
          </button>

          {/* Ordered List */}
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("orderedList") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          {/* Blockquote */}
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("blockquote") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-300" />

          {/* Link */}
          <button
            onClick={setLink}
            className={`rounded p-2 transition-colors hover:bg-gray-200 ${
              editor.isActive("link") ? "bg-gray-300" : ""
            }`}
            type="button"
          >
            <LinkIcon className="h-4 w-4" />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-300" />

          {/* Undo */}
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="rounded p-2 transition-colors hover:bg-gray-200 disabled:opacity-30"
            type="button"
          >
            <Undo className="h-4 w-4" />
          </button>

          {/* Redo */}
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="rounded p-2 transition-colors hover:bg-gray-200 disabled:opacity-30"
            type="button"
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
