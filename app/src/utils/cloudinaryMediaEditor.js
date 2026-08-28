export const MEDIA_EDITOR_SCRIPT_SRC = "https://media-editor.cloudinary.com/latest/all.js";

export class CloudinaryMediaEditorUnavailableError extends Error {
  constructor(message = "Image editor is unavailable.") {
    super(message);
    this.name = "CloudinaryMediaEditorUnavailableError";
  }
}

let activeMediaEditor = null;

const isBrowserMediaEditorReady = (windowRef = globalThis) => typeof windowRef.cloudinary?.mediaEditor === "function";

export const buildMediaEditorOptions = ({ cloudName, publicId } = {}) => {
  const cleanCloudName = String(cloudName || "").trim();
  const cleanPublicId = String(publicId || "").trim();

  if (!cleanCloudName || !cleanPublicId) {
    throw new CloudinaryMediaEditorUnavailableError("Image editor configuration is missing.");
  }

  return {
    cloudName: cleanCloudName,
    publicIds: [cleanPublicId],
    image: {
      steps: ["resizeAndCrop", "textOverlays", "export"],
      resizeAndCrop: {
        cropPresets: ["original", "square", "landscape-16:9", "landscape-4:3"],
      },
      export: {
        formats: ["jpg", "png", "webp"],
        quality: ["auto", "best", "good"],
        download: false,
        share: false,
      },
    },
  };
};

export const normalizeMediaEditorExport = (event = {}) => {
  const candidate = event.assets?.[0] || event.asset || event.info || event;

  return {
    publicId: candidate.public_id || candidate.publicId || event.public_id || event.publicId || "",
    secureUrl: candidate.secure_url || candidate.secureUrl || candidate.url || candidate.downloadUrl || event.secure_url || event.secureUrl || event.url || "",
    transformation: candidate.transformation || event.transformation || "",
  };
};

export const cleanupMediaEditorDocumentState = (documentRef = globalThis.document) => {
  const body = documentRef?.body;
  const root = documentRef?.documentElement;

  for (const element of [body, root]) {
    element?.style?.removeProperty?.("overflow");
    element?.style?.removeProperty?.("padding-right");
    element?.classList?.remove?.("q-body--prevent-scroll", "overflow-hidden");
  }
};

const destroyMediaEditor = (editor, documentRef) => {
  if (typeof editor?.destroy === "function") {
    editor.destroy();
  } else if (typeof editor?.hide === "function") {
    editor.hide();
  }

  if (activeMediaEditor === editor) {
    activeMediaEditor = null;
  }

  cleanupMediaEditorDocumentState(documentRef);
};

export const loadMediaEditorScript = ({ windowRef = globalThis, documentRef = globalThis.document, scriptSrc = MEDIA_EDITOR_SCRIPT_SRC } = {}) => {
  if (isBrowserMediaEditorReady(windowRef)) {
    return Promise.resolve();
  }

  if (!documentRef?.createElement || !documentRef?.head) {
    return Promise.reject(new CloudinaryMediaEditorUnavailableError());
  }

  const existingScript = documentRef.querySelector?.(`script[src="${scriptSrc}"]`);

  if (existingScript) {
    if (existingScript.dataset?.mediaEditorLoaded === "true") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      existingScript.addEventListener?.(
        "load",
        () => {
          existingScript.dataset.mediaEditorLoaded = "true";
          resolve();
        },
        { once: true }
      );
      existingScript.addEventListener?.("error", () => reject(new CloudinaryMediaEditorUnavailableError()), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = documentRef.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      script.dataset.mediaEditorLoaded = "true";
      resolve();
    };
    script.onerror = () => reject(new CloudinaryMediaEditorUnavailableError());
    documentRef.head.appendChild(script);
  });
};

export const openCloudinaryMediaEditor = async ({ cloudName, publicId, onExport, windowRef = globalThis, documentRef = globalThis.document } = {}) => {
  await loadMediaEditorScript({ windowRef, documentRef });

  const mediaEditorFactory = windowRef.cloudinary?.mediaEditor;

  if (typeof mediaEditorFactory !== "function") {
    throw new CloudinaryMediaEditorUnavailableError();
  }

  const editor = mediaEditorFactory();
  destroyMediaEditor(activeMediaEditor, documentRef);
  activeMediaEditor = editor;
  cleanupMediaEditorDocumentState(documentRef);
  editor.update(buildMediaEditorOptions({ cloudName, publicId }));

  if (typeof onExport === "function" && typeof editor.on === "function") {
    editor.on("export", (event) => {
      destroyMediaEditor(editor, documentRef);
      onExport(normalizeMediaEditorExport(event));
    });
  }

  if (typeof editor.on === "function") {
    for (const eventName of ["close", "cancel", "abort"]) {
      editor.on(eventName, () => destroyMediaEditor(editor, documentRef));
    }
  }

  if (typeof editor.show !== "function") {
    throw new CloudinaryMediaEditorUnavailableError();
  }

  editor.show();
  return editor;
};
