import { useState, useRef, useEffect } from "react";
import { Bold, Italic, List, Link } from "lucide-react";

export default function RichTextEditor({ value, onChange }) {
  const [linkUrl, setLinkUrl] = useState("");
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command, commandValue = null) => {
    document.execCommand(command, false, commandValue);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="richTextField">
      <span>Content</span>
      <div className="richToolbar">
        <button type="button" title="Bold" onClick={() => runCommand("bold")}><Bold size={16} /></button>
        <button type="button" title="Italic" onClick={() => runCommand("italic")}><Italic size={16} /></button>
        <button type="button" title="Bullet list" onClick={() => runCommand("insertUnorderedList")}><List size={16} /></button>
        <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" />
        <button type="button" title="Add link" onClick={() => { if (linkUrl) runCommand("createLink", linkUrl); setLinkUrl(""); }}><Link size={16} /></button>
      </div>
      <div
        ref={editorRef}
        className="richEditor"
        contentEditable
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
