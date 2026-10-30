/**
 * CRM Attachment Utilities
 *
 * Provides file type validation, size checking, thumbnail generation,
 * metadata serialization into CRM activity notes, and parsing for lead message history.
 */

// Supported MIME types and file extensions
export const ALLOWED_EXTENSIONS = {
  image: [".jpg", ".jpeg", ".png", ".webp"],
  pdf: [".pdf"],
  document: [".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"],
  video: [".mp4", ".webm", ".mov"]
};

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

// In-memory session object URL cache to allow opening/downloading original files during active session
const sessionAttachmentBlobCache = new Map();

/**
 * Register a local file in session blob cache
 */
export const registerSessionAttachment = (id, file) => {
  if (!id || !file) return;
  try {
    const objectUrl = URL.createObjectURL(file);
    sessionAttachmentBlobCache.set(id, {
      file,
      objectUrl,
      name: file.name,
      type: file.type,
      size: file.size
    });
    return objectUrl;
  } catch (err) {
    console.warn("Failed to create object URL for attachment:", err);
    return null;
  }
};

/**
 * Retrieve a cached session attachment
 */
export const getSessionAttachment = (id) => {
  return sessionAttachmentBlobCache.get(id);
};

/**
 * Formats byte size into human-readable string (KB, MB)
 */
export const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1));
  return `${val} ${sizes[i] || "B"}`;
};

/**
 * Determines file category from filename and mime type
 */
export const getAttachmentCategory = (filename = "", mimeType = "") => {
  const name = filename.toLowerCase();
  const type = mimeType.toLowerCase();

  if (
    type.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  ) {
    return "image";
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    type.startsWith("video/") ||
    name.endsWith(".mp4") ||
    name.endsWith(".webm") ||
    name.endsWith(".mov")
  ) {
    return "video";
  }

  if (
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    type.includes("officedocument") ||
    type.includes("text/csv") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv") ||
    name.endsWith(".txt")
  ) {
    return "document";
  }

  return "other";
};

/**
 * Validates a single selected file
 */
export const validateAttachmentFile = (file) => {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  // Size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the maximum allowed size of 15 MB (${formatFileSize(file.size)}).`
    };
  }

  // Type validation
  const category = getAttachmentCategory(file.name, file.type);
  if (category === "other") {
    return {
      valid: false,
      error: `"${file.name}" has an unsupported format. Supported formats: Images (JPG, PNG, WEBP), PDF, Documents (DOC, DOCX, XLS, XLSX, CSV), Videos (MP4, WebM).`
    };
  }

  return { valid: true, category };
};

/**
 * Generates a lightweight thumbnail for image attachments.
 * Resizes image to fit 300x300 and compresses as JPEG with quality 0.65
 * to keep string size < 15KB so it comfortably fits in MySQL TEXT columns.
 */
export const generateImageThumbnail = (file, maxWidth = 300, maxHeight = 300) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Low-overhead compressed JPEG data URL
          const thumbDataUrl = canvas.toDataURL("image/jpeg", 0.65);
          resolve(thumbDataUrl);
        } catch (err) {
          console.warn("Failed to generate image canvas thumbnail:", err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

/**
 * Serializes message content and attachment metadata into an Activity notes string.
 */
export const serializeMessageWithAttachments = (messageText, attachments = []) => {
  const baseMessage = (messageText || "").trim();

  if (!attachments || attachments.length === 0) {
    return baseMessage;
  }

  const sanitizedAttachments = attachments.map((att, idx) => {
    return {
      id: att.id || `att-${Date.now()}-${idx}`,
      name: att.name || `file_${idx + 1}`,
      type: att.type || "application/octet-stream",
      size: Number(att.size) || 0,
      category: att.category || getAttachmentCategory(att.name, att.type),
      thumbnail: att.thumbnail && att.thumbnail.length < 25000 ? att.thumbnail : null,
      storageRef: att.storageRef || `lead_msg_att_${Date.now()}_${idx}`,
      uploadedAt: att.uploadedAt || new Date().toISOString()
    };
  });

  const summaryLines = sanitizedAttachments
    .map((a) => `• ${a.name} (${a.category.toUpperCase()}, ${formatFileSize(a.size)})`)
    .join("\n");

  const humanReadableSection = `\n\n📎 Attachments (${sanitizedAttachments.length}):\n${summaryLines}`;
  const metadataToken = `\n\n[ATTACHMENTS_METADATA: ${JSON.stringify(sanitizedAttachments)}]`;

  return `${baseMessage}${humanReadableSection}${metadataToken}`;
};

/**
 * Parses message notes and extracts any saved attachments metadata and cleaned message text.
 */
export const parseMessageAndAttachments = (rawNotes = "") => {
  if (!rawNotes || typeof rawNotes !== "string") {
    return { cleanText: "", attachments: [] };
  }

  let cleanText = rawNotes;
  let attachments = [];

  // Match [ATTACHMENTS_METADATA: [...]]
  const metaMatch = rawNotes.match(/\[ATTACHMENTS_METADATA:\s*(\[.*?\])\s*\]/s);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      if (Array.isArray(parsed)) {
        attachments = parsed.map((item) => {
          // If cached session object URL exists, attach it
          const cached = getSessionAttachment(item.id);
          return {
            ...item,
            objectUrl: cached ? cached.objectUrl : null
          };
        });
      }
    } catch (err) {
      console.warn("Could not parse [ATTACHMENTS_METADATA] JSON from activity notes:", err);
    }

    // Remove the metadata token from display text
    cleanText = cleanText.replace(/\[ATTACHMENTS_METADATA:\s*\[.*?\]\s*\]/s, "");
  }

  // Remove the human-readable attachment summary so text view is clean
  cleanText = cleanText.replace(/\n*📎 Attachments \(\d+\):[\s\S]*?(?=\n\n|\n*$)/i, "");

  // Remove legacy file markers if any, e.g. [File: ...]
  cleanText = cleanText.replace(/\[File:\s*[^\]]+\]\s*/gi, "");

  return {
    cleanText: cleanText.trim(),
    attachments
  };
};
