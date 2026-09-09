import { useState } from "react";
import { optimizeImage } from "../../../utils/imageOptimizer.js";
import { Save, ImagePlus, Trash2 } from "lucide-react";
import RichTextEditor from "../shared/RichTextEditor.jsx";

export default function BlogPostEditor({ categories, initialPost, onBack, onSave }) {
  const [postForm, setPostForm] = useState(() => ({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    imageUrl: "",
    imageVariants: {},
    authorName: "Store Team",
    isActive: true,
    ...(initialPost || {}),
    category: initialPost?.category?._id || initialPost?.category || "",
    publishedAt: initialPost?.publishedAt ? new Date(initialPost.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  }));
  const [uploadStatus, setUploadStatus] = useState("");

  const uploadBlogImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Optimizing blog image...");
    try {
      const optimized = await optimizeImage(file, { purpose: "blog" });
      setPostForm((current) => ({ ...current, imageUrl: optimized.url, imageVariants: optimized.variants || {} }));
      setUploadStatus("Two optimized images created: 300×300 for home and up to 800×400 for the blog page.");
    } catch (error) {
      setUploadStatus(error.message || "Unable to optimize the blog image.");
      event.target.value = "";
    }
  };

  return (
    <form className="panel formPanel blogEditorPage" onSubmit={(event) => { event.preventDefault(); onSave(postForm); }}>
      <div className="panelHeader">
        <h2>{postForm._id ? "Edit Post" : "New Post"}</h2>
        <div className="toolbar">
          <button className="inlineButton" type="button" onClick={onBack}>Back to Blog</button>
          <button className="primaryButton" type="submit"><Save size={18} /> Save Post</button>
        </div>
      </div>
      <div className="formGrid">
        <label><span>Title</span><input value={postForm.title || ""} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} required /></label>
        <label><span>Slug</span><input value={postForm.slug || ""} onChange={(event) => setPostForm({ ...postForm, slug: event.target.value })} placeholder="Auto-generated from title" /></label>
        <label><span>Category</span>
          <select value={postForm.category || ""} onChange={(event) => setPostForm({ ...postForm, category: event.target.value })}>
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.parent?.name ? `${category.parent.name} / ${category.name}` : category.name}
              </option>
            ))}
          </select>
        </label>
        <label><span>Author</span><input value={postForm.authorName || ""} onChange={(event) => setPostForm({ ...postForm, authorName: event.target.value })} /></label>
        <label><span>Publish date</span><input type="date" value={postForm.publishedAt || ""} onChange={(event) => setPostForm({ ...postForm, publishedAt: event.target.value })} /></label>
        <label className="toggleRow"><input type="checkbox" checked={postForm.isActive !== false} onChange={(event) => setPostForm({ ...postForm, isActive: event.target.checked })} /><span>Active</span></label>
      </div>
      <label><span>Excerpt</span><textarea value={postForm.excerpt || ""} onChange={(event) => setPostForm({ ...postForm, excerpt: event.target.value })} /></label>
      <RichTextEditor value={postForm.content || ""} onChange={(content) => setPostForm({ ...postForm, content })} />
      <label className="uploadBox compactUpload"><ImagePlus size={18} /><span>Upload blog image</span><input type="file" accept="image/*" onChange={uploadBlogImage} /></label>
      {postForm.imageUrl && <div className="blogImagePreview"><img className="formPreviewImage" src={postForm.imageVariants?.detail || postForm.imageUrl} alt="" /><button className="mediaRemove" type="button" title="Delete blog image" aria-label="Delete blog image" onClick={() => setPostForm({ ...postForm, imageUrl: "", imageVariants: {} })}><Trash2 size={16} /></button></div>}
      {uploadStatus && <p className="mutedText">{uploadStatus}</p>}
    </form>
  );
}
