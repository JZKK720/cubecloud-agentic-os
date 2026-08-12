import { useState, useEffect, useCallback } from "react";
import { Search, X, FileText, Plus } from "lucide-react";
import { useI18n } from "../../components/useI18n";

// ── Types ─────────────────────────────────────────────────

interface VaultFileInfo {
  name: string;
  content: string;
  updatedAt: number;
}

interface VaultSearchResult {
  fileName: string;
  score: number;
  snippet: string;
}

// ── Component ─────────────────────────────────────────────

function Knowledge(): React.JSX.Element {
  const { t } = useI18n();
  const [files, setFiles] = useState<VaultFileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<VaultFileInfo | null>(null);
  const [editContent, setEditContent] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);

  const loadFiles = useCallback(async (): Promise<void> => {
    try {
      const list = await window.hermesAPI.listVaultFiles();
      setFiles(list);
    } catch {
      // Transient IPC failure
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function handleSearch(): Promise<void> {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await window.hermesAPI.searchVault(search);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  }

  async function handleSelectFile(file: VaultFileInfo): Promise<void> {
    setSelectedFile(file);
    setEditContent(file.content);
    setIsEditing(false);
    setSearchResults([]);
  }

  async function handleSave(): Promise<void> {
    if (!selectedFile) return;
    try {
      await window.hermesAPI.updateVaultFile(selectedFile.name, editContent);
      setSelectedFile({ ...selectedFile, content: editContent });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadFiles();
    } catch {
      // Best-effort save
    }
  }

  async function handleCreateFile(): Promise<void> {
    const name = newFileName.trim();
    if (!name) return;
    const fileName = name.endsWith(".md") ? name : `${name}.md`;
    try {
      await window.hermesAPI.addVaultFile(fileName, `# ${name}\n\n`);
      setNewFileName("");
      setShowNewFile(false);
      await loadFiles();
      const newFile = { name: fileName, content: `# ${name}\n\n`, updatedAt: Date.now() };
      handleSelectFile(newFile);
      setIsEditing(true);
    } catch {
      // Best-effort
    }
  }

  async function handleDeleteFile(name: string): Promise<void> {
    try {
      await window.hermesAPI.deleteVaultFile(name);
      if (selectedFile?.name === name) {
        setSelectedFile(null);
        setEditContent("");
      }
      await loadFiles();
    } catch {
      // Best-effort
    }
  }

  return (
    <div className="knowledge-container">
      <div className="knowledge-header">
        <div>
          <h2 className="knowledge-title">{t("knowledge.title")}</h2>
          <p className="knowledge-subtitle">{t("knowledge.subtitle")}</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowNewFile(!showNewFile)}
        >
          <Plus size={14} />
          {t("knowledge.newFile")}
        </button>
      </div>

      {showNewFile && (
        <div className="knowledge-new-file">
          <input
            className="input"
            type="text"
            placeholder={t("knowledge.fileNamePlaceholder")}
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFileName.trim()) handleCreateFile();
            }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCreateFile}
            disabled={!newFileName.trim()}
          >
            {t("knowledge.create")}
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="knowledge-search">
        <Search size={15} />
        <input
          className="knowledge-search-input"
          type="text"
          placeholder={t("knowledge.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        {search && (
          <button
            className="btn-ghost"
            onClick={() => {
              setSearch("");
              setSearchResults([]);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="knowledge-search-results">
          {searchResults.map((result) => (
            <button
              key={result.fileName}
              className="knowledge-search-result"
              onClick={() => {
                const file = files.find((f) => f.name === result.fileName);
                if (file) handleSelectFile(file);
              }}
            >
              <div className="knowledge-search-result-header">
                <FileText size={14} />
                <span className="knowledge-search-result-name">
                  {result.fileName}
                </span>
                <span className="knowledge-search-result-score">
                  {result.score} matches
                </span>
              </div>
              <div className="knowledge-search-result-snippet">
                {result.snippet}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="knowledge-body">
        {/* File list */}
        <div className="knowledge-file-list">
          {files.length === 0 ? (
            <div className="knowledge-empty">
              <p className="knowledge-empty-text">{t("knowledge.noFiles")}</p>
              <p className="knowledge-empty-hint">{t("knowledge.noFilesHint")}</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.name}
                className={`knowledge-file-item ${selectedFile?.name === file.name ? "active" : ""}`}
                onClick={() => handleSelectFile(file)}
              >
                <FileText size={14} />
                <span className="knowledge-file-name">{file.name}</span>
                <button
                  className="btn-ghost knowledge-file-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file.name);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Editor / Preview */}
        <div className="knowledge-editor">
          {selectedFile ? (
            <>
              <div className="knowledge-editor-header">
                <span className="knowledge-editor-filename">
                  {selectedFile.name}
                </span>
                <div className="knowledge-editor-actions">
                  {saved && (
                    <span className="knowledge-saved">{t("common.saved")}</span>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? t("knowledge.preview") : t("knowledge.edit")}
                  </button>
                  {isEditing && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSave}
                    >
                      {t("knowledge.save")}
                    </button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <textarea
                  className="knowledge-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              ) : (
                <div className="knowledge-preview">
                  <pre className="knowledge-preview-content">
                    {selectedFile.content}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="knowledge-editor-empty">
              <p className="knowledge-empty-text">{t("knowledge.selectFile")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Knowledge;