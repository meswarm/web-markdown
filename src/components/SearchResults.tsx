import type { RelatedNote } from '../utils/notesysApi';

export interface SearchResultsProps {
  results: RelatedNote[];
  onSelectNote: (notePath: string) => void;
  onClose: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelectNote,
  onClose,
}) => {
  return (
    <div className="search-results-overlay">
      <div className="search-results-panel">
        <div className="search-results-header">
          <span className="search-results-title">
            搜索结果
            <span className="search-results-count">{results.length}</span>
          </span>
          <button
            className="search-results-close"
            onClick={onClose}
            title="关闭"
          >
            取消
          </button>
        </div>

        <div className="search-results-list">
          {results.length === 0 ? (
            <div className="search-results-empty">未找到相关笔记</div>
          ) : (
            results.map((note, idx) => (
              <button
                key={idx}
                className="search-result-item"
                onClick={() => onSelectNote(note.note_path)}
              >
                <div className="search-result-info">
                  <span className="search-result-title-text">{note.note_title}</span>
                  <span className="search-result-path">{note.note_path}</span>
                </div>
                <div className="search-result-score">
                  <div
                    className="search-result-score-bar"
                    style={{ width: `${Math.min(note.score, 100)}%` }}
                  />
                  <span className="search-result-score-text">{note.score}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
